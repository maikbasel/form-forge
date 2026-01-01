use actions_core::ports::driving::ActionService;
use actions_pdf::adapter::PdfActionAdapter;
use actions_web::handler::{
    attach_ability_modifier_calculation_script, attach_saving_throw_modifier_calculation_script,
    attach_skill_modifier_calculation_script,
};
use actix_cors::Cors;
use actix_web::{get, web, App, HttpResponse, HttpServer};
use anyhow::{Context, Result};
use common::db::DatabaseConfig;
use common::error::ApiErrorResponse;
use common::telemetry;
use dotenvy::from_path;
use serde::Serialize;
use sheets_core::ports::driven::{SheetPdfPort, SheetReferencePort, SheetStoragePort};
use sheets_core::ports::driving::SheetService;
use sheets_db::adapter::SheetReferenceDb;
use sheets_pdf::adapter::SheetsPdf;
use sheets_storage::adapter::SheetFileStorage;
use sheets_storage::config::StorageConfig;
use sheets_web::handler::{
    download_sheet, get_sheet_form_fields, upload_sheet, UploadSheetRequest, UploadSheetResponse,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use tracing_actix_web::TracingLogger;
use utoipa::OpenApi;
use utoipa_actix_web::AppExt;
use utoipa_swagger_ui::SwaggerUi;

/// Health check response
#[derive(Serialize, utoipa::ToSchema)]
struct HealthResponse {
    status: String,
    version: String,
}

#[utoipa::path(
    get,
    path = "/health",
    tag = "Health",
    responses(
        (status = 200, description = "Service is healthy", body = HealthResponse)
    )
)]
#[get("/health")]
async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

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
    let sheet_storage_cfg = StorageConfig::initialize()
        .await
        .context("failed to initialize storage config")?;
    let sheet_storage_port: Arc<dyn SheetStoragePort> =
        Arc::new(SheetFileStorage::new(sheet_storage_cfg.clone()));
    let sheet_reference_port: Arc<dyn SheetReferencePort> =
        Arc::new(SheetReferenceDb::new(pool.clone()));
    let sheet_service = SheetService::new(sheet_pdf_port, sheet_storage_port, sheet_reference_port);

    let action_storage_port: Arc<dyn actions_core::ports::driven::SheetStoragePort> =
        Arc::new(SheetFileStorage::new(sheet_storage_cfg.clone()));
    let action_reference_port: Arc<dyn actions_core::ports::driven::SheetReferencePort> =
        Arc::new(SheetReferenceDb::new(pool));
    let action_pdf_port: Arc<dyn actions_core::ports::driven::ActionPdfPort> =
        Arc::new(PdfActionAdapter);
    let action_service =
        ActionService::new(action_reference_port, action_storage_port, action_pdf_port);

    #[derive(OpenApi)]
    #[openapi(
        paths(
            health_check,
            sheets_web::handler::upload_sheet,
            sheets_web::handler::download_sheet
        ),
        components(schemas(HealthResponse, UploadSheetRequest, UploadSheetResponse, ApiErrorResponse)),
        tags(
        (name = "Health", description = "Health check endpoint"),
        (name = "Sheets", description = "Operations related to form-fillable PDF sheets"),
        (name = "DnD 5e", description = "Operations related to attaching calculation scripts to D&D 5e character sheet's AcroForm fields"),
        ),
        info(
            title = "Form Forge API",
            version = "0.1.0",
            description = r#"A REST API for uploading D&D 5e character sheet PDFs, discovering form fields, and attaching predefined calculation actions. Users map fields to actions (e.g. ability mods, skills, proficiency) to generate dynamic, self-calculating PDFs. No custom JavaScript is required—only safe, declarative actions from a curated catalog."#,
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
        let cors = Cors::permissive(); // FIXME: Configure for production.

        App::new()
            .into_utoipa_app()
            .openapi(ApiDoc::openapi())
            .app_data(web::Data::new(sheet_service.clone()))
            .app_data(web::Data::new(action_service.clone()))
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
            .wrap(TracingLogger::default())
            .wrap(cors)
    })
    .bind(addr)?
    .run()
    .await
    .context("HTTP server encountered an error")?;

    Ok(())
}
