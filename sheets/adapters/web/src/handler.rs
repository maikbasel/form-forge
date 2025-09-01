use actix_multipart::form::MultipartForm;
use actix_multipart::form::tempfile::TempFile;
use actix_web::error::{ErrorBadRequest, ErrorInternalServerError};
use actix_web::http::header;
use actix_web::{HttpResponse, web};
use sheets_core::error::SheetError;
use sheets_core::ports::driven::{SheetReferencePort, SheetStoragePort};
use sheets_core::ports::driving::import_sheet;
use sheets_core::sheet::Sheet;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, MultipartForm)]
pub struct UploadSheetRequest {
    #[multipart(limit = "5MB")]
    pub sheet: TempFile,
}

pub async fn upload_sheet(
    storage_port: web::Data<Arc<dyn SheetStoragePort>>,
    reference_port: web::Data<Arc<dyn SheetReferencePort>>,
    MultipartForm(payload): MultipartForm<UploadSheetRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let path = payload.sheet.file.path().to_path_buf();

    import_sheet(
        storage_port.get_ref().clone(),
        reference_port.get_ref().clone(),
        Sheet::new(path, payload.sheet.file_name),
    )
    .await
    .map(|sheet_reference| {
        let location = format!("/sheets/{}", sheet_reference.id);
        HttpResponse::Created()
            .insert_header((header::LOCATION, location))
            .finish()
    })
    .map_err(|err| match err {
        SheetError::InvalidFileName => ErrorBadRequest(err),
        SheetError::InvalidFilePath => ErrorBadRequest(err),
        SheetError::StorageError(_) => ErrorInternalServerError(err),
        SheetError::DatabaseError(_) => ErrorInternalServerError(err),
    })
}

pub async fn download_sheet(
    app_data: web::Data<Arc<dyn SheetStoragePort>>,
    sheet_id: web::Path<Uuid>,
) -> Result<HttpResponse, actix_web::Error> {
    todo!("not implemented yet")
}
