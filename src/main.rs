use actix_web::{App, HttpServer, web};
use anyhow::{Context, Result};
use common::telemetry;
use sheets_core::ports::driven::{SheetReferencePort, SheetStoragePort};
use sheets_db::adapter::SheetReferenceDb;
use sheets_storage::adapter::SheetFileStorage;
use sheets_storage::config::StorageConfig;
use std::sync::Arc;
use tracing_actix_web::TracingLogger;

#[actix_web::main]
async fn main() -> Result<()> {
    telemetry::initialize()?;

    let addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8080".to_string());

    let storage_cfg = StorageConfig::initialize()
        .await
        .context("failed to initialize storage config")?;
    let storage_port: Arc<dyn SheetStoragePort> =
        Arc::new(SheetFileStorage::new(storage_cfg.clone()));
    let reference_port: Arc<dyn SheetReferencePort> = Arc::new(SheetReferenceDb::new());

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
