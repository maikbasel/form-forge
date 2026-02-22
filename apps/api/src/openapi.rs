use actions_web::handler::{
    AttachAbilityModCalcScriptRequest, AttachSavingThrowModifierCalculationScriptRequest,
    AttachSkillModifierCalculationScriptRequest,
};
use common::error::ProblemDetails;
use sheets_web::handler::{
    DownloadSheetResponse, ListSheetFieldsResponse, SheetFieldDto, UploadSheetRequest,
    UploadSheetResponse,
};
use utoipa::OpenApi;

use crate::health::HealthResponse;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::health::health_check,
        sheets_web::handler::upload_sheet,
        sheets_web::handler::download_sheet,
        sheets_web::handler::get_sheet_form_fields,
        actions_web::handler::attach_ability_modifier_calculation_script,
        actions_web::handler::attach_saving_throw_modifier_calculation_script,
        actions_web::handler::attach_skill_modifier_calculation_script,
    ),
    components(schemas(
        HealthResponse,
        UploadSheetRequest,
        UploadSheetResponse,
        DownloadSheetResponse,
        ListSheetFieldsResponse,
        SheetFieldDto,
        ProblemDetails,
        AttachAbilityModCalcScriptRequest,
        AttachSavingThrowModifierCalculationScriptRequest,
        AttachSkillModifierCalculationScriptRequest,
    )),
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
