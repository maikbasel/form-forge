mod test_utils;

#[cfg(test)]
mod tests {
    use crate::test_utils;
    use actix_web::http::{header, StatusCode};
    use actix_web::test;
    use common::app_config::AppConfig;
    use common::telemetry;
    use uuid::Uuid;

    #[actix_web::test]
    async fn test_should_store_sheet_and_mapping() {
        let app_config = AppConfig::initialize()
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
        let location = location.to_str().expect("Location header is valid");
        assert_eq!(location.starts_with("/sheets/"), true);
        let id_part = location.split("/").last().expect("Location header has id");
        assert!(Uuid::parse_str(id_part).is_ok());
    }
}
