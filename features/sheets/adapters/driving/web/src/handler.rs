use actix_multipart::form::MultipartForm;
use actix_multipart::form::tempfile::TempFile;
use actix_web::error::ErrorBadRequest;
use actix_web::http::header;
use actix_web::{HttpResponse, web};
use sheets_core::ports::driven::{MetadataPort, StoragePort};
use sheets_core::ports::driving::import_sheet;
use sheets_core::sheet::Sheet;
use std::fs::File;
use std::io::BufReader;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, MultipartForm)]
pub struct UploadSheetRequest {
    #[multipart(limit = "5MB")]
    pub sheet: TempFile,
}

pub async fn upload_sheet(
    storage_port: web::Data<Arc<dyn StoragePort>>,
    metadata_port: web::Data<Arc<dyn MetadataPort>>,
    MultipartForm(payload): MultipartForm<UploadSheetRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let sheet_path = payload.sheet.file.path().to_path_buf();
    let sheet_file = File::open(sheet_path)?;
    let sheet_reader = BufReader::new(sheet_file);

    import_sheet(
        storage_port.get_ref().clone(),
        metadata_port.get_ref().clone(),
        Sheet::new(sheet_reader),
    )
    .await
    .map(|id| {
        let location = format!("/sheets/{}", id);
        HttpResponse::Created()
            .insert_header((header::LOCATION, location))
            .finish()
    })
    .map_err(|err| ErrorBadRequest(err))
}

pub async fn download_sheet(
    app_data: web::Data<Arc<dyn StoragePort>>,
    sheet_id: web::Path<Uuid>,
) -> Result<HttpResponse, actix_web::Error> {
    todo!("not implemented yet")
}
