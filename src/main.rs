use actix_web::{App, HttpServer, web};
use anyhow::{Context, Result};
use common::telemetry;
use sheets_core::ports::driven::{MetadataPort, StoragePort};
use sheets_db::adapter::SheetMetadataDb;
use sheets_storage::adapter::FileStorage;
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
    let storage_port: Arc<dyn StoragePort> = Arc::new(FileStorage::new(storage_cfg.clone()));
    let metadata_port: Arc<dyn MetadataPort> = Arc::new(SheetMetadataDb::new());

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(storage_port.clone()))
            .app_data(web::Data::new(metadata_port.clone()))
            .configure(sheets_web::configure)
            .wrap(TracingLogger::default())
    })
    .bind(addr)?
    .run()
    .await
    .context("HTTP server encountered an error")?;

    Ok(())
}
