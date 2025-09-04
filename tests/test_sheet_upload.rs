mod test_utils;

#[cfg(test)]
mod tests {
    use crate::test_utils;
    use crate::test_utils::AsyncTestContext;
    use actix_web::http::{StatusCode, header};
    use actix_web::test;
    use common::telemetry;
    use pretty_assertions::assert_eq;
    use rstest::*;
    use sheets_core::ports::driven::{SheetReferencePort, SheetStoragePort};
    use sheets_core::ports::driving::SheetService;
    use sheets_db::adapter::SheetReferenceDb;
    use sheets_storage::adapter::SheetFileStorage;
    use sheets_storage::config::StorageConfig;
    use std::sync::Arc;
    use tempdir::TempDir;
    use uuid::Uuid;

    #[fixture]
    async fn async_ctx() -> AsyncTestContext {
        AsyncTestContext::setup().await
    }

    #[rstest]
    #[actix_web::test]
    async fn test_should_upload_sheet_and_binding(#[future] async_ctx: AsyncTestContext) {
        let async_ctx = async_ctx.await;
        let sheet_reference_port: Arc<dyn SheetReferencePort> =
            Arc::new(SheetReferenceDb::new(async_ctx.pool));
        let tmp_dir = TempDir::new("tests").expect("create temp dir");
        let storage_cfg = StorageConfig {
            data_dir: tmp_dir.path().to_path_buf(),
        };
        let sheet_storage_port: Arc<dyn SheetStoragePort> =
            Arc::new(SheetFileStorage::new(storage_cfg.clone()));
        let sheet_service = SheetService::new(sheet_storage_port, sheet_reference_port);
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(sheet_service);
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
        let tmp_dir = TempDir::new("tests").expect("create temp dir");
        let storage_cfg = StorageConfig {
            data_dir: tmp_dir.path().to_path_buf(),
        };
        let storage_port: Arc<dyn SheetStoragePort> =
            Arc::new(SheetFileStorage::new(storage_cfg.clone()));
        let sheet_service = SheetService::new(storage_port, reference_port);
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(sheet_service);
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

        let resp = test::call_service(&app, req).await;

        assert_eq!(resp.status(), StatusCode::OK);
        let body_bytes = test::read_body(resp).await;
        assert!(!body_bytes.is_empty());
        assert!(body_bytes.starts_with(b"%PDF-"));
    }
}
