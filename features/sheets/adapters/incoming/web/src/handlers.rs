use crate::request::SheetRequest;
use actix_multipart::form::MultipartForm;
use actix_web::http::header;
use actix_web::{HttpResponse, web};
use common::app_config::AppConfig;
use uuid::Uuid;

pub async fn upload_sheet_and_bindings(
    app_data: web::Data<AppConfig>,
    MultipartForm(payload): MultipartForm<SheetRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let sheet_id = Uuid::new_v4();

    let location = format!("/sheets/{}", sheet_id);

    Ok(HttpResponse::Created()
        .insert_header((header::LOCATION, location))
        .finish())
}
