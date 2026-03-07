use crate::error::ApiError;
use actions_core::action::{ActionTypeMetadata, CalculationAction, FieldRoleMetadata};
use actions_core::ports::driving::ActionService;
use actix_web::{HttpResponse, get, put, web};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FieldRoleMetadataDto {
    pub key: String,
    pub required: bool,
    pub is_target: bool,
}

impl From<FieldRoleMetadata> for FieldRoleMetadataDto {
    fn from(role: FieldRoleMetadata) -> Self {
        Self {
            key: role.key,
            required: role.required,
            is_target: role.is_target,
        }
    }
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ActionTypeMetadataDto {
    pub id: String,
    pub action_label: String,
    pub roles: Vec<FieldRoleMetadataDto>,
}

impl From<ActionTypeMetadata> for ActionTypeMetadataDto {
    fn from(meta: ActionTypeMetadata) -> Self {
        Self {
            id: meta.id,
            action_label: meta.action_label,
            roles: meta.roles.into_iter().map(Into::into).collect(),
        }
    }
}

/// Schema wrapper for utoipa — represents the externally-tagged `CalculationAction` enum.
///
/// utoipa cannot derive `ToSchema` for serde externally-tagged enums with `rename_all_fields`,
/// so we define the schema manually to match the serde output.
#[derive(ToSchema)]
#[schema(
    example = json!({"AbilityModifier": {"abilityScoreFieldName": "STR", "abilityModifierFieldName": "STR_mod"}})
)]
#[allow(dead_code, clippy::enum_variant_names)]
enum CalculationActionSchema {
    AbilityModifier {
        #[schema(rename = "abilityScoreFieldName")]
        score_field_name: String,
        #[schema(rename = "abilityModifierFieldName")]
        modifier_field_name: String,
    },
    SavingThrowModifier {
        #[schema(rename = "abilityModifierFieldName")]
        ability_modifier_field_name: String,
        #[schema(rename = "proficiencyFieldName")]
        proficiency_field_name: String,
        #[schema(rename = "proficiencyBonusFieldName")]
        proficiency_bonus_field_name: String,
        #[schema(rename = "savingThrowModifierFieldName")]
        saving_throw_modifier_field_name: String,
    },
    SkillModifier {
        #[schema(rename = "abilityModifierFieldName")]
        ability_modifier_field_name: String,
        #[schema(rename = "proficiencyFieldName")]
        proficiency_field_name: String,
        #[schema(rename = "expertiseFieldName")]
        expertise_field_name: Option<String>,
        #[schema(rename = "halfProfFieldName")]
        half_prof_field_name: Option<String>,
        #[schema(rename = "proficiencyBonusFieldName")]
        proficiency_bonus_field_name: String,
        #[schema(rename = "skillModifierFieldName")]
        skill_modifier_field_name: String,
    },
}

#[utoipa::path(
    put,
    path = "/dnd5e/{sheet_id}/actions",
    tag = "DnD 5e",
    operation_id = "attachCalculationAction",
    summary = "Attach a calculation action to a sheet",
    description = "Attaches a JavaScript calculation script to a target PDF AcroForm field in a DnD 5e character sheet.\n\n\
The request body is a JSON object with the action type as the key and field mappings as the value.\n\n\
Supported action types: `AbilityModifier`, `SavingThrowModifier`, `SkillModifier`.\n\n\
The script is embedded directly in the PDF's AcroForm structure for real-time updates.\n\n\
Note: Sending a request targeting the same field will replace the existing script on that field.",
    params(
        ("sheet_id" = String, Path, description = "ID of the uploaded sheet", example = "123e4567-e89b-12d3-a456-426614174000")
    ),
    request_body(
        content = CalculationActionSchema,
        content_type = "application/json",
        description = "JSON object with the action variant as key and field name mappings as value."
    ),
    responses(
        (status = 204, description = "Calculation script successfully attached.")
    ),
)]
#[put("/dnd5e/{sheet_id}/actions")]
pub async fn attach_calculation_action(
    action_service: web::Data<ActionService>,
    sheet_id: web::Path<Uuid>,
    request: web::Json<CalculationAction>,
) -> Result<HttpResponse, ApiError> {
    let sheet_id = sheet_id.into_inner();
    action_service
        .attach_calculation_script(&sheet_id, request.into_inner())
        .await?;
    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    get,
    path = "/dnd5e/action-types",
    tag = "DnD 5e",
    operation_id = "listActionTypes",
    summary = "List available action types",
    description = "Returns metadata for all available calculation action types, including their field roles.\n\n\
This endpoint powers the frontend action configuration UI dynamically.",
    responses(
        (status = 200, description = "List of available action types", body = Vec<ActionTypeMetadataDto>)
    ),
)]
#[get("/dnd5e/action-types")]
pub async fn list_action_types() -> HttpResponse {
    let catalog: Vec<ActionTypeMetadataDto> = CalculationAction::action_type_catalog()
        .into_iter()
        .map(Into::into)
        .collect();
    HttpResponse::Ok().json(catalog)
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AttachedActionResponse {
    pub id: String,
    pub action_type: String,
    pub target_field: String,
    pub mapping: serde_json::Value,
}

#[utoipa::path(
    get,
    path = "/dnd5e/{sheet_id}/actions",
    tag = "DnD 5e",
    operation_id = "listAttachedActions",
    summary = "List attached actions for a sheet",
    description = "Returns all calculation actions that have been attached to form fields in this sheet.",
    params(
        ("sheet_id" = String, Path, description = "ID of the sheet", example = "123e4567-e89b-12d3-a456-426614174000")
    ),
    responses(
        (status = 200, description = "List of attached actions", body = Vec<AttachedActionResponse>)
    ),
)]
#[get("/dnd5e/{sheet_id}/actions")]
pub async fn list_attached_actions(
    action_service: web::Data<ActionService>,
    sheet_id: web::Path<Uuid>,
) -> Result<HttpResponse, ApiError> {
    let sheet_id = sheet_id.into_inner();
    let actions = action_service.list_attached_actions(&sheet_id).await?;

    let response: Vec<AttachedActionResponse> = actions
        .into_iter()
        .map(|a| AttachedActionResponse {
            id: a.id.to_string(),
            action_type: a.action_type,
            target_field: a.target_field,
            mapping: a.mapping,
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}
