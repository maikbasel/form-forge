use actix_web::{App, HttpServer, web};
use anyhow::{Context, Result};
use common::app_config::AppConfig;
use common::telemetry;
use tracing_actix_web::TracingLogger;

#[actix_web::main]
async fn main() -> Result<()> {
    let addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8080".to_string());
    let app_config = AppConfig::initialize()
        .await
        .context("failed to initialize app config")?;

    telemetry::initialize()?;

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(app_config.clone()))
            .configure(sheets_web::configure)
            .wrap(TracingLogger::default())
    })
    .bind(addr)?
    .run()
    .await
    .context("HTTP server encountered an error")?;

    Ok(())
}
