#[macro_export]
macro_rules! app {
    ($app_config:expr) => {{
        actix_web::test::init_service(
            actix_web::App::new()
                .app_data(actix_web::web::Data::new($app_config))
                .configure(sheets_web::configure)
                .wrap(tracing_actix_web::TracingLogger::default()),
        )
        .await
    }};
}

use std::path::PathBuf;
pub(crate) use app;
use common::multipart_form::MultipartFormDataBuilder;

pub fn dnd_multipart_form_data() -> MultipartFormDataBuilder {
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

    multipart_form_data_builder
}