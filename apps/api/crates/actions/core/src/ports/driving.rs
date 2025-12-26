pub use crate::action::CalculationAction;
use crate::error::ActionError;
use crate::ports::driven::{ActionPdfPort, SheetReferencePort, SheetStoragePort};
use std::sync::Arc;
use tracing::{Span, debug, info, instrument};
use uuid::Uuid;

#[derive(Clone)]
pub struct ActionService {
    sheet_reference_port: Arc<dyn SheetReferencePort>,
    sheet_storage_port: Arc<dyn SheetStoragePort>,
    action_pdf_port: Arc<dyn ActionPdfPort>,
}

impl ActionService {
    pub fn new(
        sheet_reference_port: Arc<dyn SheetReferencePort>,
        sheet_storage_port: Arc<dyn SheetStoragePort>,
        action_pdf_port: Arc<dyn ActionPdfPort>,
    ) -> Self {
        Self {
            sheet_reference_port,
            sheet_storage_port,
            action_pdf_port,
        }
    }

    #[instrument(name = "actions.attach.calculation", skip(self, sheet_id, action), level = "info", err, fields(sheet_id = %sheet_id, action = tracing::field::Empty, target_field = tracing::field::Empty))]
    pub async fn attach_calculation_script(
        &self,
        sheet_id: &Uuid,
        action: CalculationAction,
    ) -> Result<(), ActionError> {
        debug!(%sheet_id, "attaching calculation script for sheet");

        let sheet_reference = self.sheet_reference_port.find_by_id(sheet_id).await?;
        debug!("sheet reference located");

        let sheet_path = self.sheet_storage_port.read(sheet_reference.path).await?;

        debug!(path = %sheet_path.display(), "sheet path resolved and readable");

        let dnd_helpers_js =
            include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/js/dnd-helpers.js"));
        self.action_pdf_port
            .add_doc_level_js(dnd_helpers_js, &sheet_path)?;

        info!("document-level helper JS attached");

        let (action_js, target_field, action_label) = match action {
            CalculationAction::AbilityModifier {
                score_field_name,
                modifier_field_name,
            } => {
                let score_field_name = Self::serialize_field_name(&score_field_name)?; // turns a name into a quoted JS string
                let action_js = format!("calculateModifierFromScore({});", score_field_name);
                (action_js, modifier_field_name, "AbilityModifier")
            }
            CalculationAction::SavingThrowModifier {
                ability_modifier_field_name,
                proficiency_field_name,
                proficiency_bonus_field_name,
                saving_throw_modifier_field_name,
            } => {
                let ability_modifier_field_name =
                    Self::serialize_field_name(&ability_modifier_field_name)?;
                let proficiency_field_name = Self::serialize_field_name(&proficiency_field_name)?;
                let proficiency_bonus_field_name =
                    Self::serialize_field_name(&proficiency_bonus_field_name)?;
                let action_js = format!(
                    "calculateSaveFromFields({}, {}, {});",
                    ability_modifier_field_name,
                    proficiency_field_name,
                    proficiency_bonus_field_name
                );
                (
                    action_js,
                    saving_throw_modifier_field_name,
                    "SavingThrowModifier",
                )
            }
            CalculationAction::SkillModifier {
                ability_modifier_field_name,
                proficiency_field_name,
                expertise_field_name,
                half_prof_field_name,
                proficiency_bonus_field_name,
                skill_modifier_field_name,
            } => {
                let ability_modifier_field_name =
                    Self::serialize_field_name(&ability_modifier_field_name)?;
                let proficiency_field_name = Self::serialize_field_name(&proficiency_field_name)?;
                let expertise_field_name = match &expertise_field_name {
                    Some(name) => Self::serialize_field_name(name)?,
                    None => "undefined".to_string(),
                };
                let half_prof_field_name = match &half_prof_field_name {
                    Some(name) => Self::serialize_field_name(name)?,
                    None => "undefined".to_string(),
                };
                let proficiency_bonus_field_name =
                    Self::serialize_field_name(&proficiency_bonus_field_name)?;
                let action_js = format!(
                    // calculateSkillFromFields(abilityModField, proficientField, expertiseField, halfProfField, proficiencyBonusField)
                    "calculateSkillFromFields({}, {}, {}, {}, {});",
                    ability_modifier_field_name,
                    proficiency_field_name,
                    expertise_field_name,
                    half_prof_field_name,
                    proficiency_bonus_field_name
                );
                (action_js, skill_modifier_field_name, "SkillModifier")
            }
        };

        // enrich span with dynamic fields
        let span = Span::current();
        span.record("action", tracing::field::display(action_label));
        span.record("target_field", tracing::field::display(&target_field));

        self.action_pdf_port
            .attach_calculation_js(&action_js, &sheet_path, &target_field)?;

        info!(target_field = %target_field, "calculation JS attached to target field");

        info!("attach_calculation_script completed successfully");

        Ok(())
    }

    fn serialize_field_name(field_name: &String) -> Result<String, ActionError> {
        serde_json::to_string(&field_name).map_err(|e| {
            ActionError::InvalidAction(format!("failed to serialize field name: {}", e))
        })
    }
}
