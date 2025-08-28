mod test_utils;

#[cfg(test)]
mod tests {
    use crate::test_utils;
    use actix_web::http::{StatusCode, header};
    use actix_web::test;
    use common::telemetry;
    use sheets_storage::config::StorageConfig;
    use uuid::Uuid;

    #[actix_web::test]
    async fn test_should_upload_sheet_and_binding() {
        let app_config = StorageConfig::initialize()
            .await
            .expect("initialize app config");
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(app_config);
        let (header, body) = test_utils::dnd_multipart_form_data().build();
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

    #[actix_web::test]
    async fn test_should_download_sheet() {
        let app_config = StorageConfig::initialize()
            .await
            .expect("initialize app config");
        telemetry::initialize().expect("initialize telemetry");
        let app = test_utils::app!(app_config);
        let (header, body) = test_utils::dnd_multipart_form_data().build();
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
