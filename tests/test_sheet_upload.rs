#[cfg(test)]
mod tests {
    use actix_web::http::{StatusCode, header};
    use actix_web::{App, test, web};
    use common::app_config::AppConfig;
    use common::multipart_form::MultipartFormDataBuilder;
    use common::telemetry;
    use std::path::PathBuf;
    use tracing_actix_web::TracingLogger;
    use uuid::Uuid;

    #[actix_web::test]
    async fn test_should_store_sheet_and_mapping() {
        let app_config = AppConfig::initialize()
            .await
            .expect("initialize app config");
        telemetry::initialize().expect("initialize telemetry");
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(app_config.clone()))
                .configure(sheets_web::configure)
                .wrap(TracingLogger::default()),
        )
        .await;
        let here = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let sheet_path = here.join("tests/fixtures/DnD_5E_CharacterSheet_FormFillable.pdf");
        let bindings_path =
            here.join("tests/fixtures/DnD_5E_CharacterSheet_FormFillable_bindings.json");
        let mut multipart_form_data_builder = MultipartFormDataBuilder::new();
        multipart_form_data_builder
            .with_file(
                sheet_path,
                "sheet",
                "application/pdf",
                "DnD_5E_CharacterSheet_FormFillable.pdf",
            )
            .with_file(
                bindings_path,
                "bindings",
                "application/json",
                "bindings.json",
            );
        let (header, body) = multipart_form_data_builder.build();
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
