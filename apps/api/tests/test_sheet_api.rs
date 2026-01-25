mod test_utils;

#[cfg(test)]
#[cfg(target_os = "linux")] // Requires Docker and Linux containers - only runs on ubuntu-latest GitHub runners
mod tests {
    use crate::test_utils;
    use crate::test_utils::AsyncTestContext;
    use actix_web::http::{StatusCode, header};
    use actix_web::test;
    use common::telemetry;
    use pretty_assertions::assert_eq;
    use rstest::*;
    use sheets_core::ports::driven::{SheetPdfPort, SheetReferencePort, SheetStoragePort};
    use sheets_core::ports::driving::SheetService;
    use sheets_db::adapter::SheetReferenceDb;
    use sheets_pdf::adapter::SheetsPdf;
    use sheets_web::handler::{
        DownloadSheetResponse, ListSheetFieldsResponse, UploadSheetResponse, download_sheet,
        get_sheet_form_fields, upload_sheet,
    };
    use std::sync::Arc;
    use uuid::Uuid;

    #[fixture]
    async fn async_ctx() -> AsyncTestContext {
        AsyncTestContext::setup().await
    }

    #[rstest]
    #[actix_web::test]
    async fn test_should_upload_sheet(#[future] async_ctx: AsyncTestContext) {
        let async_ctx = async_ctx.await;
        let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);
        let sheet_reference_port: Arc<dyn SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool));
        let sheet_storage_port: Arc<dyn SheetStoragePort> = async_ctx.s3_storage;
        let sheet_service =
            SheetService::new(sheet_pdf_port, sheet_storage_port, sheet_reference_port);
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(app_data: [sheet_service], services: [upload_sheet]);
        let (header, body) = test_utils::dnd5e_sheet_multipart_form_data().build();
        let req = test::TestRequest::post()
            .uri("/sheets")
            .insert_header(header)
            .set_payload(body)
            .to_request();

        let resp = test::call_service(&app, req).await;

        assert_eq!(resp.status(), StatusCode::CREATED);
        assert!(resp.headers().contains_key(header::LOCATION));
        let location = resp
            .headers()
            .get(header::LOCATION)
            .expect("Location header is present");
        let location = location.to_str().expect("location header is valid");
        assert_eq!(location.starts_with("/sheets/"), true);
        let id_part = location.split("/").last().expect("location header has id");
        assert!(Uuid::parse_str(id_part).is_ok());
    }

    #[rstest]
    #[actix_web::test]
    async fn test_should_download_sheet(#[future] async_ctx: AsyncTestContext) {
        let async_ctx = async_ctx.await;
        let reference_port: Arc<dyn SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool));
        let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);
        let storage_port: Arc<dyn SheetStoragePort> = async_ctx.s3_storage;
        let sheet_service = SheetService::new(sheet_pdf_port, storage_port, reference_port);
        telemetry::initialize().expect("initialize telemetry");
        let app =
            test_utils::app!(app_data: [sheet_service], services: [upload_sheet, download_sheet]);
        let (header, body) = test_utils::dnd5e_sheet_multipart_form_data().build();
        let upload_req = test::TestRequest::post()
            .uri("/sheets")
            .insert_header(header)
            .set_payload(body)
            .to_request();
        let upload_resp = test::call_service(&app, upload_req).await;
        let location = upload_resp
            .headers()
            .get(header::LOCATION)
            .expect("location header is present");
        let location = location.to_str().expect("location header is valid");
        let req = test::TestRequest::get().uri(location).to_request();

        let resp: DownloadSheetResponse = test::call_and_read_body_json(&app, req).await;

        // S3 storage returns presigned HTTP URLs
        assert!(resp.url.starts_with("http://"));
        assert_eq!(resp.filename, "DnD_5E_CharacterSheet_FormFillable.pdf");
    }

    #[rstest]
    #[actix_web::test]
    async fn test_should_reject_fake_pdf_files(#[future] async_ctx: AsyncTestContext) {
        let async_ctx = async_ctx.await;
        let sheet_reference_port: Arc<dyn SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool));
        let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);
        let sheet_storage_port: Arc<dyn SheetStoragePort> = async_ctx.s3_storage;
        let sheet_service =
            SheetService::new(sheet_pdf_port, sheet_storage_port, sheet_reference_port);
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(app_data: [sheet_service], services: [upload_sheet]);
        let (header, body) = test_utils::fake_pdf_multipart_form_data().build();
        let req = test::TestRequest::post()
            .uri("/sheets")
            .insert_header(header)
            .set_payload(body)
            .to_request();

        let resp = test::call_service(&app, req).await;

        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    }

    #[rstest]
    #[actix_web::test]
    async fn test_should_respond_with_list_of_interactive_form_fields(
        #[future] async_ctx: AsyncTestContext,
    ) {
        let async_ctx = async_ctx.await;
        let sheet_reference_port: Arc<dyn SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool));
        let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);
        let sheet_storage_port: Arc<dyn SheetStoragePort> = async_ctx.s3_storage;
        let sheet_service =
            SheetService::new(sheet_pdf_port, sheet_storage_port, sheet_reference_port);
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(app_data: [sheet_service], services: [upload_sheet, download_sheet, get_sheet_form_fields]);
        let (header, body) = test_utils::dnd5e_sheet_multipart_form_data().build();
        let req = test::TestRequest::post()
            .uri("/sheets")
            .insert_header(header)
            .set_payload(body)
            .to_request();
        let resp: UploadSheetResponse = test::call_and_read_body_json(&app, req).await;
        let sheet_id = resp.id;

        let req = test::TestRequest::get()
            .uri(&format!("/sheets/{}/fields", sheet_id))
            .to_request();
        let resp: ListSheetFieldsResponse = test::call_and_read_body_json(&app, req).await;

        assert_eq!(resp.fields.len(), 240);
    }
}
