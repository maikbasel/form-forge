use actions_core::ports::driving::ActionService;
use actions_pdf::adapter::PdfActionAdapter;
use actions_web::handler::{
    attach_ability_modifier_calculation_script, attach_saving_throw_modifier_calculation_script,
    attach_skill_modifier_calculation_script,
};
use actix_cors::Cors;
use actix_web::{App, HttpServer, web};
use anyhow::{Context, Result};
use common::db::DatabaseConfig;
use common_telemetry as telemetry;
use dotenvy::from_path;
use sheets_core::ports::driven::{
    FailedSheetDeletionPort, SheetPdfPort, SheetReferencePort, SheetStoragePort,
};
use sheets_core::ports::driving::{SheetCleanupPort, SheetCleanupService, SheetService};
use sheets_db::adapter::{FailedSheetDeletionDb, SheetReferenceDb};
use sheets_pdf::adapter::SheetsPdf;
use sheets_s3::adapter::SheetS3Storage;
use sheets_s3::config::S3Config;
use sheets_web::handler::{download_sheet, get_sheet_form_fields, handle_s3_event, upload_sheet};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tracing::{error, info};
use tracing_actix_web::TracingLogger;
use utoipa::OpenApi;
use utoipa_actix_web::AppExt;
use utoipa_swagger_ui::SwaggerUi;

use form_forge_api::health::health_check;
use form_forge_api::openapi::ApiDoc;

#[actix_web::main]
async fn main() -> Result<()> {
    // Load environment-specific .env file based on APP_ENV
    // Falls back to .env if APP_ENV is not set or file doesn't exist
    let base_path = concat!(env!("CARGO_MANIFEST_DIR"), "/../..");
    let env_file = env::var("APP_ENV")
        .ok()
        .map(|env| format!("{}/.env.{}", base_path, env))
        .unwrap_or_else(|| format!("{}/.env", base_path));

    from_path(&env_file)
        .or_else(|_| from_path(format!("{}/.env", base_path)))
        .ok();

    telemetry::initialize()?;

    let addr = env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8081".to_string());

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

    let sheet_pdf_port: Arc<dyn SheetPdfPort> = Arc::new(SheetsPdf);
    let s3_cfg = S3Config::initialize().context("failed to initialize S3 config")?;
    let sheet_s3_storage = SheetS3Storage::new(s3_cfg.clone())
        .await
        .context("failed to initialize S3 storage")?;
    let sheet_s3_storage = Arc::new(sheet_s3_storage);
    let sheet_storage_port: Arc<dyn SheetStoragePort> = sheet_s3_storage.clone();
    let sheet_reference_db = Arc::new(SheetReferenceDb::new(pool.clone()));
    let sheet_reference_port: Arc<dyn SheetReferencePort> = sheet_reference_db.clone();
    let sheet_service = SheetService::new(
        sheet_pdf_port,
        sheet_storage_port.clone(),
        sheet_reference_port.clone(),
    );

    // Create cleanup service for S3 event webhook handling
    let failed_deletion_port: Arc<dyn FailedSheetDeletionPort> =
        Arc::new(FailedSheetDeletionDb::new(pool.clone()));
    let cleanup_service: Arc<dyn SheetCleanupPort> = Arc::new(SheetCleanupService::new(
        sheet_reference_port,
        sheet_storage_port,
        failed_deletion_port,
    ));

    // Spawn background reconciliation task
    let reconciliation_service = cleanup_service.clone();
    let ttl_days: i64 = env::var("S3_LIFECYCLE_EXPIRATION_DAYS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(7);
    tokio::spawn(async move {
        let interval = Duration::from_secs(3600); // Run every hour
        loop {
            tokio::time::sleep(interval).await;

            // Reconcile orphaned references
            match reconciliation_service
                .reconcile_orphaned_references(ttl_days)
                .await
            {
                Ok(count) => {
                    if count > 0 {
                        info!(count, "reconciled orphaned sheet references");
                    }
                }
                Err(e) => error!(error = %e, "failed to reconcile orphaned references"),
            }

            // Process failed deletions from dead letter table
            const MAX_RETRIES: i32 = 5;
            match reconciliation_service
                .process_failed_deletions(MAX_RETRIES)
                .await
            {
                Ok(count) => {
                    if count > 0 {
                        info!(count, "processed failed deletions");
                    }
                }
                Err(e) => error!(error = %e, "failed to process failed deletions"),
            }
        }
    });

    let action_storage_port: Arc<dyn actions_core::ports::driven::SheetStoragePort> =
        sheet_s3_storage;
    let action_reference_port: Arc<dyn actions_core::ports::driven::SheetReferencePort> =
        sheet_reference_db;
    let action_pdf_port: Arc<dyn actions_core::ports::driven::ActionPdfPort> =
        Arc::new(PdfActionAdapter);
    let action_service =
        ActionService::new(action_reference_port, action_storage_port, action_pdf_port);

    HttpServer::new(move || {
        let cors = Cors::permissive(); // FIXME: Configure for production.

        App::new()
            .into_utoipa_app()
            .openapi(ApiDoc::openapi())
            .app_data(web::Data::new(sheet_service.clone()))
            .app_data(web::Data::new(action_service.clone()))
            .app_data(web::Data::new(cleanup_service.clone()))
            .service(health_check)
            .service(upload_sheet)
            .service(download_sheet)
            .service(get_sheet_form_fields)
            .service(attach_ability_modifier_calculation_script)
            .service(attach_saving_throw_modifier_calculation_script)
            .service(attach_skill_modifier_calculation_script)
            .openapi_service(|api| {
                SwaggerUi::new("/swagger-ui/{_:.*}").url("/api/openapi.json", api)
            })
            .into_app()
            // Internal endpoint for S3 event webhooks (not in OpenAPI docs)
            .service(handle_s3_event)
            .wrap(TracingLogger::default())
            .wrap(cors)
    })
    .bind(addr)?
    .run()
    .await
    .context("HTTP server encountered an error")?;

    // Flush pending telemetry data before exit
    telemetry::shutdown();

    Ok(())
}
