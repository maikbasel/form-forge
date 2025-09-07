use crate::handler::UploadSheetRequest;
use common::error::ApiErrorResponse;
use utoipa::OpenApi;

/// OpenAPI documentation for Form Forge API.
#[derive(OpenApi)]
#[openapi(
    paths(crate::handler::upload_sheet, crate::handler::download_sheet),
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
