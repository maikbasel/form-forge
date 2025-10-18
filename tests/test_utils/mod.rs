#![allow(dead_code)]

use common::multipart_form::MultipartFormDataBuilder;
use common::pdf::find_form_field_by_name;
use lopdf::{Document, Object};
use std::path::{Path, PathBuf};

pub fn dnd5e_sheet_multipart_form_data() -> MultipartFormDataBuilder {
    let here = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let sheet_path = here.join("tests/fixtures/DnD_5E_CharacterSheet_FormFillable.pdf");
    let mut multipart_form_data_builder = MultipartFormDataBuilder::new();
    multipart_form_data_builder.with_file(
        sheet_path,
        "sheet",
        "application/pdf",
        "DnD_5E_CharacterSheet_FormFillable.pdf",
    );

    multipart_form_data_builder
}

pub fn fake_pdf_multipart_form_data() -> MultipartFormDataBuilder {
    let here = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let fake_pdf_path = here.join("tests/fixtures/fake_pdf.pdf");

    let mut multipart_form_data_builder = MultipartFormDataBuilder::new();
    multipart_form_data_builder.with_file(
        fake_pdf_path,
        "sheet",
        "application/pdf", // Claiming it's a PDF via MIME type
        "fake.pdf",
    );

    multipart_form_data_builder
}

#[macro_export]
macro_rules! app {
    // Version that accepts both app data and services
    (
        app_data: [$($app_data:expr),* $(,)?],
        services: [$($service:expr),* $(,)?]
    ) => {{
        let mut app = actix_web::App::new();
        $(
            app = app.app_data(actix_web::web::Data::new($app_data));
        )*
        $(
            app = app.service($service);
        )*

        actix_web::test::init_service(
            app.wrap(tracing_actix_web::TracingLogger::default())
        )
        .await
    }};
}

// --- Test utilities for database setup ---
use common::db::DatabaseConfig;
use sqlx::PgPool;
use testcontainers::ImageExt;
use testcontainers_modules::postgres::Postgres;
use testcontainers_modules::testcontainers::runners::AsyncRunner;

pub struct AsyncTestContext {
    pub pool: PgPool,
    // Keep the container alive for the duration of the test by holding the handle.
    _container: testcontainers_modules::testcontainers::ContainerAsync<Postgres>,
}

impl AsyncTestContext {
    pub async fn setup() -> Self {
        let container = Postgres::default()
            .with_user("postgres")
            .with_password("postgres")
            .with_db_name("form-forge")
            .with_tag("17")
            .start()
            .await
            .expect("start postgres");

        let db_cfg = DatabaseConfig::initialize().expect("initialize db config");
        let postgres_url = format!(
            "postgres://{}:{}@{}:{}/{}",
            db_cfg.user,
            db_cfg.password,
            container.get_host().await.expect("get host"),
            container.get_host_port_ipv4(5432).await.expect("get port"),
            db_cfg.database
        );

        let pool = PgPool::connect_lazy(&postgres_url).expect("create connection pool");
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("run migrations");

        Self {
            pool,
            _container: container,
        }
    }
}

pub fn read_document_javascript(path: &Path) -> Vec<(String, String)> {
    let doc = Document::load(path).expect("load PDF");
    let mut js_scripts = Vec::new();

    let catalog_id = doc.trailer.get(b"Root").unwrap().as_reference().unwrap();
    let catalog = doc.get_object(catalog_id).unwrap().as_dict().unwrap();

    let names_id = catalog.get(b"Names").unwrap().as_reference().unwrap();
    let names = doc.get_object(names_id).unwrap().as_dict().unwrap();

    let js_tree_id = names.get(b"JavaScript").unwrap().as_reference().unwrap();
    let js_tree = doc.get_object(js_tree_id).unwrap().as_dict().unwrap();

    let names_array = js_tree.get(b"Names").unwrap().as_array().unwrap();

    // Names array contains pairs: [name1, action_ref1, name2, action_ref2, ...]
    for chunk in names_array.chunks(2) {
        if chunk.len() == 2 {
            let name = match &chunk[0] {
                Object::String(bytes, _) => String::from_utf8_lossy(bytes).to_string(),
                _ => continue,
            };

            let action_id = chunk[1].as_reference().unwrap();
            let action_dict = doc.get_object(action_id).unwrap().as_dict().unwrap();

            let js_obj = action_dict.get(b"JS").unwrap();
            let js_code = match js_obj {
                Object::String(bytes, _) => String::from_utf8_lossy(bytes).to_string(),
                _ => continue,
            };

            js_scripts.push((name, js_code));
        }
    }

    js_scripts
}

pub fn read_field_calculation_js(path: &Path, field_name: &str) -> String {
    let doc = Document::load(path).expect("load PDF");

    let catalog_id = doc.trailer.get(b"Root").unwrap().as_reference().unwrap();
    let catalog = doc.get_object(catalog_id).unwrap().as_dict().unwrap();

    let acroform_id = catalog.get(b"AcroForm").unwrap().as_reference().unwrap();
    let acroform = doc.get_object(acroform_id).unwrap().as_dict().unwrap();

    let fields_array_id = acroform.get(b"Fields").unwrap().as_reference().unwrap();

    // Use the shared function
    let field_id =
        find_form_field_by_name(&doc, fields_array_id, field_name).expect("field not found");

    let field_dict = doc.get_object(field_id).unwrap().as_dict().unwrap();
    let aa_dict = field_dict.get(b"AA").unwrap().as_dict().unwrap();
    let calc_action_id = aa_dict.get(b"C").unwrap().as_reference().unwrap();
    let calc_action_dict = doc.get_object(calc_action_id).unwrap().as_dict().unwrap();

    let js_obj = calc_action_dict.get(b"JS").unwrap();
    match js_obj {
        Object::String(bytes, _) => String::from_utf8_lossy(bytes).to_string(),
        _ => panic!("JS is not a string"),
    }
}

pub(crate) use app;
