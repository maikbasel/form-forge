use actix_web::{App, HttpServer, web};
use anyhow::{Context, Result};
use common::db::DatabaseConfig;
use common::telemetry;
use dotenvy::dotenv;
use sheets_core::ports::driven::{SheetPdfPort, SheetReferencePort, SheetStoragePort};
use sheets_core::ports::driving::SheetService;
use sheets_db::adapter::SheetReferenceDb;
use sheets_pdf::adapter::SheetsPdf;
use sheets_storage::adapter::SheetFileStorage;
use sheets_storage::config::StorageConfig;
use sheets_web::handler::{download_sheet, upload_sheet};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use tracing_actix_web::TracingLogger;
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

    HttpServer::new(move || {
        App::new()
            .into_utoipa_app()
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
