use crate::error::ApiError;
use actix_files::NamedFile;
use actix_multipart::form::MultipartForm;
use actix_multipart::form::tempfile::TempFile;
use actix_web::http::header::{
    Charset, ContentDisposition, DispositionParam, DispositionType, ExtendedValue, LOCATION,
};
use actix_web::{HttpResponse, get, mime, post, web};
use sheets_core::error::SheetError;
use sheets_core::ports::driving::SheetService;
use sheets_core::sheet::Sheet;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, MultipartForm, ToSchema)]
pub struct UploadSheetRequest {
    #[multipart(limit = "5MB")]
    #[schema(value_type = String, format = Binary, content_media_type = "application/pdf")]
    pub sheet: TempFile,
}

#[utoipa::path(
    post,
    path = "/sheets",
    request_body(content = UploadSheetRequest, content_type = "multipart/form-data")
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

#[utoipa::path(get, path = "/sheets/{sheet_id}")]
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
