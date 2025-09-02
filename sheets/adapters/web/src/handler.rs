use actix_multipart::form::MultipartForm;
use actix_multipart::form::tempfile::TempFile;
use actix_web::error::{ErrorBadRequest, ErrorInternalServerError};
use actix_web::http::header;
use actix_web::{HttpResponse, web};
use sheets_core::error::SheetError;
use sheets_core::ports::driving::SheetService;
use sheets_core::sheet::Sheet;

#[derive(Debug, MultipartForm)]
pub struct UploadSheetRequest {
    #[multipart(limit = "5MB")]
    pub sheet: TempFile,
}

pub async fn upload_sheet(
    sheet_service: web::Data<SheetService>,
    MultipartForm(payload): MultipartForm<UploadSheetRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let path = payload.sheet.file.path().to_path_buf();

    sheet_service
        .import_sheet(Sheet::new(path, payload.sheet.file_name))
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
