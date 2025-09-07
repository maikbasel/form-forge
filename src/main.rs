use actix_web::{App, HttpServer, web};
use anyhow::{Context, Result};
use common::db::DatabaseConfig;
use common::error::ApiErrorResponse;
use common::telemetry;
use dotenvy::dotenv;
use sheets_core::ports::driven::{SheetPdfPort, SheetReferencePort, SheetStoragePort};
use sheets_core::ports::driving::SheetService;
use sheets_db::adapter::SheetReferenceDb;
use sheets_pdf::adapter::SheetsPdf;
use sheets_storage::adapter::SheetFileStorage;
use sheets_storage::config::StorageConfig;
use sheets_web::handler::{UploadSheetRequest, download_sheet, upload_sheet};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use tracing_actix_web::TracingLogger;
use utoipa::OpenApi;
use utoipa_actix_web::AppExt;
use utoipa_swagger_ui::SwaggerUi;

#[actix_web::main]
async fn main() -> Result<()> {
    dotenv().ok();

    telemetry::initialize()?;

    let addr = env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8081".to_string());

    let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);
    let sheet_storage_cfg = StorageConfig::initialize()
        .await
        .context("failed to initialize storage config")?;
    let storage_port: Arc<dyn SheetStoragePort> =
        Arc::new(SheetFileStorage::new(sheet_storage_cfg.clone()));

    let db_cfg = DatabaseConfig::initialize()?;
    let postgres_url = format!(
        "postgres://{}:{}@{}:{}/{}",
        db_cfg.user, db_cfg.password, db_cfg.host, db_cfg.port, db_cfg.database
    );

    let pool = PgPoolOptions::new()
        .max_connections(db_cfg.max_connections)
        .connect(&postgres_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    let reference_port: Arc<dyn SheetReferencePort> = Arc::new(SheetReferenceDb::new(pool));

    let sheet_service = SheetService::new(sheet_pdf_port, storage_port, reference_port);

    #[derive(OpenApi)]
    #[openapi(
        paths(sheets_web::handler::upload_sheet, sheets_web::handler::download_sheet),
        components(schemas(UploadSheetRequest, ApiErrorResponse)),
        tags(
        (name = "Sheets", description = "Operations related to form-fillable PDF sheets")
        ),
        info(
            title = "Form Forge API",
            version = "0.1.0",
            description = r#"A REST API for uploading D&D 5e character sheet PDFs, discovering form fields, and applying predefined calculation actions. Users map fields to actions (e.g. ability mods, skills, proficiency) to generate dynamic, self-calculating PDFs. No custom JavaScript is required—only safe, declarative actions from a curated catalog."#,
            license(name = "MIT", url = "https://opensource.org/license/MIT")
        ),
        servers(
        (url = "https://api.formforge.maikbasel.com", description = "Production"),
        (url = "https://dev.api.formforge.maikbasel.com", description = "Staging"),
        (url = "http://127.0.0.1:8081", description = "Local")
        )
    )]
    pub struct ApiDoc;

    HttpServer::new(move || {
        App::new()
            .into_utoipa_app()
            .openapi(ApiDoc::openapi())
            .app_data(web::Data::new(sheet_service.clone()))
            .service(upload_sheet)
            .service(download_sheet)
            .openapi_service(|api| {
                SwaggerUi::new("/swagger-ui/{_:.*}").url("/api/openapi.json", api)
            })
            .into_app()
            .wrap(TracingLogger::default())
    })
    .bind(addr)?
    .run()
    .await
    .context("HTTP server encountered an error")?;

    Ok(())
}
