use crate::error::ApiError;
use actix_files::NamedFile;
use actix_multipart::form::MultipartForm;
use actix_multipart::form::tempfile::TempFile;
use actix_web::http::header::{
    Charset, ContentDisposition, DispositionParam, DispositionType, ExtendedValue, LOCATION,
};
use actix_web::{HttpResponse, get, mime, post, web};
use common::error::ApiErrorResponse;
use sheets_core::error::SheetError;
use sheets_core::ports::driving::SheetService;
use sheets_core::sheet::Sheet;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, MultipartForm, ToSchema)]
pub struct UploadSheetRequest {
    /// The PDF file to upload. Max size: 5MB.
    #[multipart(limit = "5MB")]
    #[schema(value_type = String, format = Binary, content_media_type = "application/pdf")]
    pub sheet: TempFile,
}

#[utoipa::path(
    post,
    path = "/sheets",
    tag = "Sheets",
    operation_id = "uploadSheet",
    summary = "Upload a form-fillable PDF",
    description = "Uploads a form-fillable PDF file. If validation passes, returns 201 Created with a Location header pointing to the download URL.",
    request_body(
        content = UploadSheetRequest,
        content_type = "multipart/form-data",
        description = "Multipart form with a single 'sheet' field containing the PDF file."
    ),
    responses(
        (status = CREATED, description = "Sheet uploaded successfully"),
        (status = BAD_REQUEST, description = "Invalid PDF or request", body = ApiErrorResponse, content_type = "application/json",
            examples(
                ("invalid_pdf_header" = (summary = "Invalid PDF file", value = json!({"message": "invalid PDF header - file is not a PDF"}))),
                ("not_form_fillable" = (summary = "PDF not form-fillable", value = json!({"message": "PDF is not form-fillable - no interactive form fields found"}))),
                ("file_too_large" = (summary = "File size exceeded", value = json!({"message": "file size exceeds 5MB limit"}))),
                ("invalid_filename" = (summary = "Invalid filename", value = json!({"message": "invalid sheet name"})))
            )
        ),
        (status = INTERNAL_SERVER_ERROR, description = "Unexpected server error", body = ApiErrorResponse, content_type = "application/json",
            examples(
                ("storage_error" = (summary = "Storage failure", value = json!({"message": "failed to save sheet"}))),
                ("database_error" = (summary = "Database failure", value = json!({"message": "failed to save sheet reference"})))
            )
        )
    )
)]
#[post("/sheets")]
pub async fn upload_sheet(
    sheet_service: web::Data<SheetService>,
    MultipartForm(payload): MultipartForm<UploadSheetRequest>,
) -> Result<HttpResponse, ApiError> {
    let path = payload.sheet.file.path().to_path_buf();

    let sheet_reference = sheet_service
        .import_sheet(Sheet::new(path, payload.sheet.file_name))
        .await?;

    let location = format!("/sheets/{}", sheet_reference.id);
    Ok(HttpResponse::Created()
        .insert_header((LOCATION, location))
        .finish())
}

#[utoipa::path(
    get,
    path = "/sheets/{sheet_id}",
    tag = "Sheets",
    operation_id = "downloadSheet",
    params(
        ("sheet_id" = String, Path, description = "ID of the sheet to download", example = "123e4567-e89b-12d3-a456-426614174000")
    ),
    responses(
        (status = OK, description = "PDF file returned", content_type = "application/pdf"),
        (status = NOT_FOUND, description = "Sheet not found", body = ApiErrorResponse, content_type = "application/json",
            examples(
                ("sheet_not_found" = (summary = "Sheet does not exist", value = json!({"message": "sheet not found: 123e4567-e89b-12d3-a456-426614174000"})))
            )
        )
    )
)]
#[get("/sheets/{sheet_id}")]
pub async fn download_sheet(
    sheet_service: web::Data<SheetService>,
    sheet_id: web::Path<Uuid>,
) -> Result<NamedFile, ApiError> {
    let sheet_id = sheet_id.into_inner();
    let sheet = sheet_service.export_sheet(sheet_id).await?;

    let file = NamedFile::open(&sheet.path).map_err(SheetError::StorageError)?;

    let sheet_name = sheet
        .name
        .ok_or_else(|| SheetError::NotFound(sheet_id.to_string()))?;

    let cd = ContentDisposition {
        disposition: DispositionType::Attachment,
        parameters: vec![DispositionParam::FilenameExt(ExtendedValue {
            charset: Charset::Ext("UTF-8".into()),
            language_tag: None,
            value: sheet_name.into_bytes(),
        })],
    };

    Ok(file
        .set_content_disposition(cd)
        .set_content_type(mime::APPLICATION_PDF))
}
