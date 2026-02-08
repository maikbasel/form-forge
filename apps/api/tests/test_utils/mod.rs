#![allow(dead_code)]

use common::multipart_form::MultipartFormDataBuilder;
use common::pdf::find_form_field_by_name;
use lopdf::{Document, Object};
use sheets_s3::adapter::SheetS3Storage;
use sheets_s3::config::S3Config;
use std::path::{Path, PathBuf};
use std::sync::Arc;

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
use aws_config::BehaviorVersion;
use aws_sdk_s3::Client;
use aws_sdk_s3::config::{Credentials, Region};
use common::db::DatabaseConfig;
use sqlx::PgPool;
use testcontainers::ImageExt;
use testcontainers_modules::minio::MinIO;
use testcontainers_modules::postgres::Postgres;
use testcontainers_modules::testcontainers::ContainerAsync;
use testcontainers_modules::testcontainers::runners::AsyncRunner;

const TEST_BUCKET: &str = "form-forge";
const MINIO_ACCESS_KEY: &str = "minioadmin";
const MINIO_SECRET_KEY: &str = "minioadmin";

pub struct AsyncTestContext {
    pub pool: PgPool,
    pub s3_storage: Arc<SheetS3Storage>,
    // Keep containers alive for the duration of the test by holding the handles.
    _pg_container: ContainerAsync<Postgres>,
    _minio_container: ContainerAsync<MinIO>,
}

impl AsyncTestContext {
    pub async fn setup() -> Self {
        // Start Postgres container
        let pg_container = Postgres::default()
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
            pg_container.get_host().await.expect("get host"),
            pg_container
                .get_host_port_ipv4(5432)
                .await
                .expect("get port"),
            db_cfg.database
        );

        let pool = PgPool::connect_lazy(&postgres_url).expect("create connection pool");
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("run migrations");

        // Start MinIO container
        let minio_container = MinIO::default().start().await.expect("start minio");

        let minio_host = minio_container.get_host().await.expect("get minio host");
        let minio_port = minio_container
            .get_host_port_ipv4(9000)
            .await
            .expect("get minio port");
        let minio_endpoint = format!("http://{}:{}", minio_host, minio_port);

        // Create test bucket before initializing storage
        Self::create_bucket(&minio_endpoint).await;

        // Create S3 config for MinIO
        let s3_cfg = S3Config {
            endpoint: minio_endpoint.clone(),
            public_endpoint: minio_endpoint,
            public_path_prefix: String::new(),
            bucket: TEST_BUCKET.to_string(),
            access_key: MINIO_ACCESS_KEY.to_string(),
            secret_key: MINIO_SECRET_KEY.to_string(),
            region: "us-east-1".to_string(),
        };

        // Initialize S3 storage
        let s3_storage = SheetS3Storage::new(s3_cfg)
            .await
            .expect("create S3 storage");

        Self {
            pool,
            s3_storage: Arc::new(s3_storage),
            _pg_container: pg_container,
            _minio_container: minio_container,
        }
    }

    async fn create_bucket(endpoint: &str) {
        let credentials = Credentials::new(MINIO_ACCESS_KEY, MINIO_SECRET_KEY, None, None, "test");

        let s3_config = aws_sdk_s3::Config::builder()
            .behavior_version(BehaviorVersion::latest())
            .region(Region::new("us-east-1"))
            .endpoint_url(endpoint)
            .credentials_provider(credentials)
            .force_path_style(true)
            .build();

        let client = Client::from_conf(s3_config);

        client
            .create_bucket()
            .bucket(TEST_BUCKET)
            .send()
            .await
            .expect("create test bucket");
    }
}

pub fn read_document_javascript(path: &Path) -> Vec<(String, String)> {
    let doc = Document::load(path).expect("failed to load PDF document");
    let mut js_scripts = Vec::new();

    let catalog_id = doc
        .trailer
        .get(b"Root")
        .expect("pdf trailer missing 'Root'")
        .as_reference()
        .expect("'Root' is not a reference");
    let catalog = doc
        .get_object(catalog_id)
        .expect("failed to get catalog object")
        .as_dict()
        .expect("catalog object is not a dictionary");

    let names_id = catalog
        .get(b"Names")
        .expect("catalog missing 'Names'")
        .as_reference()
        .expect("'Names' is not a reference");
    let names = doc
        .get_object(names_id)
        .expect("failed to get 'Names' object")
        .as_dict()
        .expect("'Names' object is not a dictionary");

    let js_tree_id = names
        .get(b"JavaScript")
        .expect("'Names' missing 'JavaScript'")
        .as_reference()
        .expect("'JavaScript' is not a reference");
    let js_tree = doc
        .get_object(js_tree_id)
        .expect("failed to get 'JavaScript' names tree object")
        .as_dict()
        .expect("'JavaScript' names tree is not a dictionary");

    let names_array = js_tree
        .get(b"Names")
        .expect("javascript names tree missing 'Names' array")
        .as_array()
        .expect("javascript names 'Names' entry is not an array");

    // Names array contains pairs: [name1, action_ref1, name2, action_ref2, ...]
    for chunk in names_array.chunks(2) {
        if chunk.len() == 2 {
            let name = match &chunk[0] {
                Object::String(bytes, _) => String::from_utf8_lossy(bytes).to_string(),
                _ => continue,
            };

            let action_id = chunk[1]
                .as_reference()
                .expect("javascript action entry is not a reference");
            let action_dict = doc
                .get_object(action_id)
                .expect("failed to get JavaScript action object")
                .as_dict()
                .expect("javascript action object is not a dictionary");

            let js_obj = action_dict
                .get(b"JS")
                .expect("javascript action dictionary missing 'JS'");
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
    let doc = Document::load(path).expect("failed to load PDF document");

    let catalog_id = doc
        .trailer
        .get(b"Root")
        .expect("pdf trailer missing 'Root'")
        .as_reference()
        .expect("'Root' is not a reference");
    let catalog = doc
        .get_object(catalog_id)
        .expect("failed to get catalog object")
        .as_dict()
        .expect("catalog object is not a dictionary");

    let acroform_id = catalog
        .get(b"AcroForm")
        .expect("catalog missing 'AcroForm'")
        .as_reference()
        .expect("'AcroForm' is not a reference");
    let acroform = doc
        .get_object(acroform_id)
        .expect("failed to get 'AcroForm' object")
        .as_dict()
        .expect("'AcroForm' object is not a dictionary");

    let fields_array_id = acroform
        .get(b"Fields")
        .expect("'AcroForm' missing 'Fields'")
        .as_reference()
        .expect("'Fields' is not a reference");

    // Use the shared function
    let field_id =
        find_form_field_by_name(&doc, fields_array_id, field_name).expect("field not found");

    let field_dict = doc
        .get_object(field_id)
        .expect("failed to get field object")
        .as_dict()
        .expect("field object is not a dictionary");
    let aa_dict = field_dict
        .get(b"AA")
        .expect("field dictionary missing 'AA'")
        .as_dict()
        .expect("'AA' is not a dictionary");
    let calc_action_id = aa_dict
        .get(b"C")
        .expect("field 'AA' missing 'C' calculation action")
        .as_reference()
        .expect("calculation action 'C' is not a reference");
    let calc_action_dict = doc
        .get_object(calc_action_id)
        .expect("failed to get calculation action object")
        .as_dict()
        .expect("calculation action object is not a dictionary");

    let js_obj = calc_action_dict
        .get(b"JS")
        .expect("calculation action dictionary missing 'JS'");
    match js_obj {
        Object::String(bytes, _) => String::from_utf8_lossy(bytes).to_string(),
        _ => panic!("js is not a string"),
    }
}

pub(crate) use app;
