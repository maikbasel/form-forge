use actix_web::{App, HttpServer, web};
use anyhow::{Context, Result};
use common::db::DatabaseConfig;
use common::telemetry;
use dotenv::dotenv;
use sheets_core::ports::driven::{SheetReferencePort, SheetStoragePort};
use sheets_db::adapter::SheetReferenceDb;
use sheets_storage::adapter::SheetFileStorage;
use sheets_storage::config::StorageConfig;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use tracing_actix_web::TracingLogger;

#[actix_web::main]
async fn main() -> Result<()> {
    dotenv().ok();

    telemetry::initialize()?;

    let addr = env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8081".to_string());

    let sheet_storage_cfg = StorageConfig::initialize()
        .await
        .context("failed to initialize storage config")?;
    let storage_port: Arc<dyn SheetStoragePort> =
        Arc::new(SheetFileStorage::new(sheet_storage_cfg.clone()));

    let db_cfg = DatabaseConfig::initialize()?;
    let postgres_url = format!(
        "postgres://{}:{}@{}:{}/{}",
        db_cfg.user, db_cfg.password, db_cfg.host, 5432, db_cfg.database
    );

    let pool = PgPoolOptions::new()
        .max_connections(db_cfg.max_connections)
        .connect(&postgres_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    let reference_port: Arc<dyn SheetReferencePort> = Arc::new(SheetReferenceDb::new(pool));

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(storage_port.clone()))
            .app_data(web::Data::new(reference_port.clone()))
            .configure(sheets_web::configure)
            .wrap(TracingLogger::default())
    })
    .bind(addr)?
    .run()
    .await
    .context("HTTP server encountered an error")?;

    Ok(())
}
