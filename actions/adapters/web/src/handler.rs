use crate::error::ApiError;
use actions_core::ports::driving::ActionService;
use actions_core::ports::driving::CalculationAction;
use actix_web::{HttpResponse, put, web};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, ToSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AttachAbilityModCalcScriptRequest {
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm field containing the ability score.
    pub ability_score_field_name: String,

    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm field containing the target ability modifier.
    pub ability_modifier_field_name: String,
}

impl From<AttachAbilityModCalcScriptRequest> for CalculationAction {
    fn from(req: AttachAbilityModCalcScriptRequest) -> Self {
        CalculationAction::ability_modifier(
            req.ability_score_field_name,
            req.ability_modifier_field_name,
        )
    }
}

impl AttachAbilityModCalcScriptRequest {
    pub fn new(
        ability_score_field_name: impl Into<String>,
        ability_modifier_field_name: impl Into<String>,
    ) -> Self {
        Self {
            ability_score_field_name: ability_score_field_name.into(),
            ability_modifier_field_name: ability_modifier_field_name.into(),
        }
    }
}

#[utoipa::path(
    put,
    path = "/dnd5e/{sheet_id}/ability-modifier",
    tag = "DnD 5e",
    operation_id = "attachAbilityModifierCalculationScript",
    summary = "Attach an Ability Score Modifier calculation script",
    description = "Attaches a JavaScript calculation script to a ability modifier target PDF AcroForm field in a DnD 5e character sheet.\n\n\
The field will automatically calculate and display ability modifiers using the formula \
`floor((score - 10) / 2)` whenever the corresponding ability score changes.\n\n\
The script is embedded directly in the PDF's AcroForm structure for real-time updates.\n\n\
Note: Sending a request to attach a calculation script targeting the same ability modifier field will replace the existing script on that field.",
    request_body = AttachAbilityModCalcScriptRequest,
    tag = "DnD 5e",
    request_body(
        content = AttachAbilityModCalcScriptRequest,
        content_type = "application/json",
        description = "JSON object containing the names of the ability score and ability modifier fields to link together."
    ),
    responses(
        (status = 204, description = "Calculation script successfully attached to the ability modifier field.")
    ),
)]
#[put("/dnd5e/{sheet_id}/ability-modifier")]
pub async fn attach_ability_modifier_calculation_script(
    action_service: web::Data<ActionService>,
    sheet_id: web::Path<Uuid>,
    request: web::Json<AttachAbilityModCalcScriptRequest>,
) -> Result<HttpResponse, ApiError> {
    let sheet_id = sheet_id.into_inner();

    let action = request.into_inner().into();
    action_service
        .attach_calculation_script(&sheet_id, action)
        .await?;

    Ok(HttpResponse::NoContent().finish())
}
