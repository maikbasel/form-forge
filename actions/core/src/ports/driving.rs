pub use crate::action::CalculationAction;
use crate::error::ActionError;
use crate::ports::driven::{ActionPdfPort, SheetReferencePort, SheetStoragePort};
use std::sync::Arc;
use tracing::instrument;
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

    #[instrument(name = "dnd.actions.attach.ability_modifier", skip(self, sheet_id), level = "info", fields(%sheet_id))]
    pub async fn attach_calculation_script(
        &self,
        sheet_id: &Uuid,
        action: CalculationAction,
    ) -> Result<(), ActionError> {
        let sheet_reference = self.sheet_reference_port.find_by_id(sheet_id).await?;
        let sheet_path = self.sheet_storage_port.read(sheet_reference.path).await?;

        let dnd_helpers_js =
            include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/js/dnd_helpers.js"));
        self.action_pdf_port
            .add_doc_level_js(dnd_helpers_js, &sheet_path)?;

        let (action_js, target_field) = match action {
            CalculationAction::AbilityModifier {
                score_field_name,
                modifier_field_name,
            } => {
                let score_field = serde_json::to_string(&score_field_name).map_err(|e| {
                    ActionError::InvalidAction(format!(
                        "failed to serialize score field name: {}",
                        e
                    ))
                })?; // turns a name into a quoted JS string
                let action_js = format!("calculateModifierFromScore({});", score_field);
                (action_js, modifier_field_name)
            }
            CalculationAction::SavingThrowModifier {
                ability_modifier_field_name,
                proficiency_field_name,
                proficiency_bonus_field_name,
                saving_throw_modifier_field_name,
            } => {
                let ability_mod_field = serde_json::to_string(&ability_modifier_field_name)
                    .map_err(|e| {
                        ActionError::InvalidAction(format!(
                            "failed to serialize ability modifier field name: {}",
                            e
                        ))
                    })?;
                let proficiency_field =
                    serde_json::to_string(&proficiency_field_name).map_err(|e| {
                        ActionError::InvalidAction(format!(
                            "failed to serialize saving throw proficiency field name: {}",
                            e
                        ))
                    })?;
                let proficiency_bonus_field = serde_json::to_string(&proficiency_bonus_field_name)
                    .map_err(|e| {
                        ActionError::InvalidAction(format!(
                            "failed to serialize saving throw bonus field name: {}",
                            e
                        ))
                    })?;
                let action_js = format!(
                    "calculateSaveFromFields({}, {}, {});",
                    ability_mod_field, proficiency_field, proficiency_bonus_field
                );
                (action_js, saving_throw_modifier_field_name)
            }
        };
        self.action_pdf_port
            .attach_calculation_js(&action_js, &sheet_path, &target_field)?;

        Ok(())
    }
}
