use crate::error::ApiError;
use actix_files::NamedFile;
use actix_multipart::form::MultipartForm;
use actix_multipart::form::tempfile::TempFile;
use actix_web::http::header::{
    Charset, ContentDisposition, DispositionParam, DispositionType, ExtendedValue, LOCATION,
};
use actix_web::{HttpResponse, get, mime, post, web};
use common::error::ApiErrorResponse;
use serde::{Deserialize, Serialize};
use sheets_core::error::SheetError;
use sheets_core::ports::driving::SheetService;
use sheets_core::sheet::{SheetFieldRect, Sheet, SheetField};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, MultipartForm, ToSchema)]
pub struct UploadSheetRequest {
    /// The PDF file to upload. Max size: 5MB.
    #[multipart(limit = "5MB")]
    #[schema(value_type = String, format = Binary, content_media_type = "application/pdf")]
    pub sheet: TempFile,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UploadSheetResponse {
    #[schema(value_type = String, format = "uuid", example = "123e4567-e89b-12d3-a456-426614174000"
    )]
    pub id: Uuid,
}

impl UploadSheetResponse {
    pub fn new(id: Uuid) -> Self {
        Self { id }
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub struct SheetFieldRectDto {
    /// X coordinate of the upper-left corner of the field's bounding box, in PDF points.
    pub x: f32,
    /// Y coordinate of the upper-left corner of the field's bounding box, in PDF points.
    pub y: f32,
    /// Width of the field's bounding box, in PDF points.
    pub width: f32,
    /// Height of the field's bounding box, in PDF points.
    pub height: f32,
}

impl From<SheetFieldRect> for SheetFieldRectDto {
    fn from(value: SheetFieldRect) -> Self {
        Self {
            x: value.x,
            y: value.y,
            width: value.width,
            height: value.height,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SheetFieldDto {
    /// Name of the AcroForm field.
    name: String,
    /// Bounding box of the field, in PDF points.
    rect: SheetFieldRectDto,
}

impl SheetFieldDto {
    pub fn new(name: impl Into<String>, rect: SheetFieldRectDto) -> Self {
        let name = name.into();
        Self { name, rect }
    }
}

impl From<SheetField> for SheetFieldDto {
    fn from(value: SheetField) -> Self {
        let rect = value.rect.into();
        SheetFieldDto::new(value.name, rect)
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ListSheetFieldsResponse {
    /// List of interactive PDF AcroForm fields.
    pub fields: Vec<SheetFieldDto>,
}

impl ListSheetFieldsResponse {
    pub fn new(fields: Vec<SheetFieldDto>) -> Self {
        Self { fields }
    }
}

impl From<Vec<SheetField>> for ListSheetFieldsResponse {
    fn from(value: Vec<SheetField>) -> Self {
        let fields = value.into_iter().map(SheetFieldDto::from).collect();
        Self::new(fields)
    }
}

#[utoipa::path(
    post,
    path = "/sheets",
    tag = "Sheets",
    operation_id = "uploadSheet",
    summary = "Upload a form-fillable PDF",
    description = "Uploads a form-fillable PDF file. The PDF must satisfy these compatibility rules: \n\n- It must NOT be encrypted.\n- It must contain a Catalog dictionary.\n- It must contain an AcroForm dictionary.\n- It must NOT be an XFA form.\n- The AcroForm must provide a Fields array (interactive form fields).\n- It must NOT be locked via DocMDP permissions.\n\nIf validation passes, returns 201 Created with a Location header pointing to the download URL.",
    request_body(
        content = UploadSheetRequest,
        content_type = "multipart/form-data",
        description = "Multipart form with a single 'sheet' field containing the PDF file."
    ),
    responses(
        (status = CREATED, description = "Sheet uploaded successfully", body = UploadSheetResponse, content_type = "application/json"),
        (status = BAD_REQUEST, description = "Invalid PDF or request", body = ApiErrorResponse, content_type = "application/json",
            examples(
                ("invalid_pdf_header" = (summary = "Invalid PDF file", value = json!({"message": "invalid PDF header - file is not a PDF"}))),
                ("not_supported" = (summary = "PDF sheet is not supported", value = json!({"message": "PDF sheet is encrypted"}))),
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
        .json(UploadSheetResponse::new(sheet_reference.id)))
}

#[utoipa::path(
    get,
    path = "/sheets/{sheet_id}",
    tag = "Sheets",
    operation_id = "downloadSheet",
    summary = "Download enhanced PDF sheet",
    description = "Downloads a previously uploaded PDF sheet by its unique identifier. The sheet may have been enhanced with calculation scripts attached to its AcroForm fields, making it dynamic and self-calculating.",
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

#[utoipa::path(
    get,
    path = "/sheets/{sheet_id}/fields",
    tag = "Sheets",
    operation_id = "getSheetFormFields",
    summary = "Lists sheet form fields",
    description = "Lists interactive PDF AcroForm fields that support calculation actions. Only text (`/Tx`), choice (`/Ch`) fields with widget annotations are returned.",
    params(
        ("sheet_id" = String, Path, description = "ID of the uploaded sheet", example = "123e4567-e89b-12d3-a456-426614174000")
    ),
    responses(
        (status = 200, description = "List of interactive PDF AcroForm fields", body = ListSheetFieldsResponse),
        (status = NOT_FOUND, description = "Sheet not found", body = ApiErrorResponse, content_type = "application/json",
            examples(
                ("sheet_not_found" = (summary = "Sheet does not exist", value = json!({"message": "sheet not found: 123e4567-e89b-12d3-a456-426614174000"})))
            )
        )
    )
)]
#[get("/sheets/{sheet_id}/fields")]
pub async fn get_sheet_form_fields(
    sheet_service: web::Data<SheetService>,
    sheet_id: web::Path<Uuid>,
) -> Result<HttpResponse, ApiError> {
    let sheet_id = sheet_id.into_inner();

    let fields = sheet_service.list_sheet_form_fields(sheet_id).await?;
    let response = ListSheetFieldsResponse::from(fields);

    Ok(HttpResponse::Ok().json(response))
}
