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
    /// Name of the PDF AcroForm text field containing the ability score.
    pub ability_score_field_name: String,

    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm text field containing the target ability modifier.
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

#[derive(Debug, Serialize, Deserialize, ToSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AttachSavingThrowModifierCalculationScriptRequest {
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm text field containing the relevant ability modifier to calculate the saving throw modifier from.
    pub ability_modifier_field_name: String,
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm choice field that determines proficiency for this saving throw (used to decide whether to add proficiency bonus to the saving throw modifier or not).
    pub proficiency_field_name: String,
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm text field containing the actual proficiency bonus value to be added to the saving throw modifier.
    pub proficiency_bonus_field_name: String,
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm text field containing the target saving throw modifier.
    pub saving_throw_modifier_field_name: String,
}

impl AttachSavingThrowModifierCalculationScriptRequest {
    pub fn new(
        ability_modifier_field_name: impl Into<String>,
        proficiency_field_name: impl Into<String>,
        proficiency_bonus_field_name: impl Into<String>,
        saving_throw_modifier_field_name: impl Into<String>,
    ) -> Self {
        Self {
            ability_modifier_field_name: ability_modifier_field_name.into(),
            proficiency_field_name: proficiency_field_name.into(),
            proficiency_bonus_field_name: proficiency_bonus_field_name.into(),
            saving_throw_modifier_field_name: saving_throw_modifier_field_name.into(),
        }
    }
}

impl From<AttachSavingThrowModifierCalculationScriptRequest> for CalculationAction {
    fn from(req: AttachSavingThrowModifierCalculationScriptRequest) -> Self {
        CalculationAction::saving_throw_modifier(
            req.ability_modifier_field_name,
            req.proficiency_field_name,
            req.proficiency_bonus_field_name,
            req.saving_throw_modifier_field_name,
        )
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AttachSkillModifierCalculationScriptRequest {
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm text field containing the relevant ability modifier to calculate the skill modifier from.
    pub ability_modifier_field_name: String,
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm choice field that determines proficiency for this skill (used to decide whether to add proficiency bonus to the skill modifier or not).
    pub proficiency_field_name: String,
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm choice field that determines expertise for this skill (used to decide whether to add double the proficiency bonus to the skill modifier or not).
    pub expertise_field_name: Option<String>,
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm choice field that determines half-proficiency for this skill (used to decide whether to add half the proficiency bonus to the skill modifier or not).
    pub half_prof_field_name: Option<String>,
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm text field containing the actual proficiency bonus value to be added to the skill modifier.
    pub proficiency_bonus_field_name: String,
    #[validate(length(min = 1))]
    /// Name of the PDF AcroForm text field containing the target skill modifier.
    pub skill_modifier_field_name: String,
}

pub struct AttachSkillModifierCalculationScriptRequestBuilder {
    ability_modifier_field_name: String,
    proficiency_field_name: String,
    expertise_field_name: Option<String>,
    half_prof_field_name: Option<String>,
    proficiency_bonus_field_name: String,
    skill_modifier_field_name: String,
}

impl AttachSkillModifierCalculationScriptRequest {
    pub fn builder(
        ability_modifier_field_name: impl Into<String>,
        proficiency_field_name: impl Into<String>,
        proficiency_bonus_field_name: impl Into<String>,
        skill_modifier_field_name: impl Into<String>,
    ) -> AttachSkillModifierCalculationScriptRequestBuilder {
        AttachSkillModifierCalculationScriptRequestBuilder {
            ability_modifier_field_name: ability_modifier_field_name.into(),
            proficiency_field_name: proficiency_field_name.into(),
            expertise_field_name: None,
            half_prof_field_name: None,
            proficiency_bonus_field_name: proficiency_bonus_field_name.into(),
            skill_modifier_field_name: skill_modifier_field_name.into(),
        }
    }

    pub fn new(
        ability_modifier_field_name: impl Into<String>,
        proficiency_field_name: impl Into<String>,
        expertise_field_name: Option<impl Into<String>>,
        half_prof_field_name: Option<impl Into<String>>,
        proficiency_bonus_field_name: impl Into<String>,
        skill_modifier_field_name: impl Into<String>,
    ) -> Self {
        let ability_modifier_field_name = ability_modifier_field_name.into();
        let proficiency_field_name = proficiency_field_name.into();
        let expertise_field_name = expertise_field_name.map(|f| f.into());
        let half_prof_field_name = half_prof_field_name.map(|f| f.into());
        let proficiency_bonus_field_name = proficiency_bonus_field_name.into();
        let skill_modifier_field_name = skill_modifier_field_name.into();

        Self {
            ability_modifier_field_name,
            proficiency_field_name,
            expertise_field_name,
            half_prof_field_name,
            proficiency_bonus_field_name,
            skill_modifier_field_name,
        }
    }
}

impl From<AttachSkillModifierCalculationScriptRequest> for CalculationAction {
    fn from(req: AttachSkillModifierCalculationScriptRequest) -> Self {
        CalculationAction::SkillModifier {
            ability_modifier_field_name: req.ability_modifier_field_name,
            proficiency_field_name: req.proficiency_field_name,
            expertise_field_name: req.expertise_field_name,
            half_prof_field_name: req.half_prof_field_name,
            proficiency_bonus_field_name: req.proficiency_bonus_field_name,
            skill_modifier_field_name: req.skill_modifier_field_name,
        }
    }
}

impl AttachSkillModifierCalculationScriptRequestBuilder {
    pub fn expertise_field_name(mut self, field_name: impl Into<String>) -> Self {
        self.expertise_field_name = Some(field_name.into());
        self
    }

    pub fn half_prof_field_name(mut self, field_name: impl Into<String>) -> Self {
        self.half_prof_field_name = Some(field_name.into());
        self
    }

    pub fn build(self) -> AttachSkillModifierCalculationScriptRequest {
        AttachSkillModifierCalculationScriptRequest {
            ability_modifier_field_name: self.ability_modifier_field_name,
            proficiency_field_name: self.proficiency_field_name,
            expertise_field_name: self.expertise_field_name,
            half_prof_field_name: self.half_prof_field_name,
            proficiency_bonus_field_name: self.proficiency_bonus_field_name,
            skill_modifier_field_name: self.skill_modifier_field_name,
        }
    }
}

async fn attach_calculation_script<T>(
    action_service: web::Data<ActionService>,
    sheet_id: web::Path<Uuid>,
    request: web::Json<T>,
) -> Result<HttpResponse, ApiError>
where
    T: Into<CalculationAction>,
{
    let sheet_id = sheet_id.into_inner();
    let action = request.into_inner().into();

    action_service
        .attach_calculation_script(&sheet_id, action)
        .await?;

    Ok(HttpResponse::NoContent().finish())
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
    params(
        ("sheet_id" = String, Path, description = "ID of the uploaded", example = "123e4567-e89b-12d3-a456-426614174000")
    ),
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
    attach_calculation_script(action_service, sheet_id, request).await
}

#[utoipa::path(
    put,
    path = "/dnd5e/{sheet_id}/saving-throw-modifier",
    tag = "DnD 5e",
    operation_id = "attachSavingThrowModifierCalculationScript",
    summary = "Attach a Saving Throw Modifier calculation script",
    description = "Attaches a JavaScript calculation script to a saving throw modifier target PDF AcroForm field in a DnD 5e character sheet.\n\n\
The field will automatically calculate and display the saving throw modifier using the formula \
`modifier + (proficient ? proficiency_bonus : 0)` whenever any of the source fields change.\n\n\
The script is embedded directly in the PDF's AcroForm structure for real-time updates.\n\n\
Note: Sending a request to attach a calculation script targeting the same saving throw modifier field will replace the existing script on that field.",
    params(
        ("sheet_id" = String, Path, description = "ID of the uploaded sheet", example = "123e4567-e89b-12d3-a456-426614174000")
    ),
    request_body(
        content = AttachSavingThrowModifierCalculationScriptRequest,
        content_type = "application/json",
        description = "JSON object containing the names of the ability modifier, proficiency choice, and proficiency bonus fields to link together for calculating the saving throw modifier."
    ),
    responses(
        (status = 204, description = "Calculation script successfully attached to the saving throw modifier field.")
    ),
)]
#[put("/dnd5e/{sheet_id}/saving-throw-modifier")]
pub async fn attach_saving_throw_modifier_calculation_script(
    action_service: web::Data<ActionService>,
    sheet_id: web::Path<Uuid>,
    request: web::Json<AttachSavingThrowModifierCalculationScriptRequest>,
) -> Result<HttpResponse, ApiError> {
    attach_calculation_script(action_service, sheet_id, request).await
}

#[utoipa::path(
    put,
    path = "/dnd5e/{sheet_id}/skill-modifier",
    tag = "DnD 5e",
    operation_id = "attachSkillModifierCalculationScript",
    summary = "Attach a Skill Modifier calculation script",
    description = "Attaches a JavaScript calculation script to a skill modifier target PDF AcroForm field in a DnD 5e character sheet.\n\n\
The field will automatically calculate and display the skill modifier using the formula \
`floor(modifier + (proficiency_multiplier * proficiency_bonus))` whenever any of the source fields change. \
The `proficiency_multiplier` equals 1 for proficiency in the skill, 2 for expertise, and 0.5 for half-proficiency.\n\n\
The script is embedded directly in the PDF's AcroForm structure for real-time updates.\n\n\
Note: Sending a request to attach a calculation script targeting the same skill modifier field will replace the existing script on that field.",
    params(
        ("sheet_id" = String, Path, description = "ID of the uploaded sheet", example = "123e4567-e89b-12d3-a456-426614174000")
    ),
    request_body(
        content = AttachSkillModifierCalculationScriptRequest,
        content_type = "application/json",
        description = "JSON object containing the names of the ability modifier, proficiency choice, and proficiency bonus fields to link together for calculating the saving throw modifier."
    ),
    responses(
        (status = 204, description = "Calculation script successfully attached to the skill modifier field.")
    ),
)]
#[put("/dnd5e/{sheet_id}/skill-modifier")]
pub async fn attach_skill_modifier_calculation_script(
    action_service: web::Data<ActionService>,
    sheet_id: web::Path<Uuid>,
    request: web::Json<AttachSkillModifierCalculationScriptRequest>,
) -> Result<HttpResponse, ApiError> {
    attach_calculation_script(action_service, sheet_id, request).await
}
