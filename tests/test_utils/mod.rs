use common::multipart_form::MultipartFormDataBuilder;
use std::path::PathBuf;

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

#[macro_export]
macro_rules! app {
    ($($app_data:expr),+ $(,)?) => {{
        let mut app = actix_web::App::new();
        $(
            app = app.app_data(actix_web::web::Data::new($app_data));
        )+

        actix_web::test::init_service(
            app.configure(sheets_web::configure)
                .wrap(tracing_actix_web::TracingLogger::default()),
        )
        .await
    }};
}

// --- Test utilities for database setup ---
use common::db::DatabaseConfig;
use sqlx::PgPool;
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

        Self { pool, _container: container }
    }
}

pub(crate) use app;
