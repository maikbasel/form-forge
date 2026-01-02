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

        debug!(action = action_label, target_field = %target_field, action_js = %action_js, "applying calculation action");

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::driven::{
        MockActionPdfPort, MockSheetReferencePort, MockSheetStoragePort, SheetReference,
    };
    use pretty_assertions::assert_eq;
    use std::path::PathBuf;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_should_attach_ability_modifier_calculation_script() {
        // Arrange
        let sheet_id = Uuid::new_v4();
        let sheet_path = PathBuf::from("/tmp/test-sheet.pdf");
        let sheet_reference = SheetReference::new(sheet_id, sheet_path.clone());

        let mut sheet_reference_port = MockSheetReferencePort::new();
        sheet_reference_port
            .expect_find_by_id()
            .withf(move |id| *id == sheet_id)
            .times(1)
            .returning(move |_| Ok(sheet_reference.clone()));

        let mut sheet_storage_port = MockSheetStoragePort::new();
        sheet_storage_port
            .expect_read()
            .withf(move |path| *path == sheet_path)
            .times(1)
            .returning(|path| Ok(path));

        let mut action_pdf_port = MockActionPdfPort::new();
        action_pdf_port
            .expect_add_doc_level_js()
            .times(1)
            .returning(|_, _| Ok(()));
        action_pdf_port
            .expect_attach_calculation_js()
            .withf(|js, _, target_field| {
                js.contains("calculateModifierFromScore") && target_field == "modifier"
            })
            .times(1)
            .returning(|_, _, _| Ok(()));

        let service = ActionService::new(
            Arc::new(sheet_reference_port),
            Arc::new(sheet_storage_port),
            Arc::new(action_pdf_port),
        );

        let action = CalculationAction::ability_modifier("score", "modifier");

        // Act
        let result = service.attach_calculation_script(&sheet_id, action).await;

        // Assert
        assert_eq!(result, Ok(()));
    }

    #[tokio::test]
    async fn test_should_attach_saving_throw_modifier_calculation_script() {
        // Arrange
        let sheet_id = Uuid::new_v4();
        let sheet_path = PathBuf::from("/tmp/test-sheet.pdf");
        let sheet_reference = SheetReference::new(sheet_id, sheet_path.clone());

        let mut sheet_reference_port = MockSheetReferencePort::new();
        sheet_reference_port
            .expect_find_by_id()
            .times(1)
            .returning(move |_| Ok(sheet_reference.clone()));

        let mut sheet_storage_port = MockSheetStoragePort::new();
        sheet_storage_port
            .expect_read()
            .times(1)
            .returning(|path| Ok(path));

        let mut action_pdf_port = MockActionPdfPort::new();
        action_pdf_port
            .expect_add_doc_level_js()
            .times(1)
            .returning(|_, _| Ok(()));
        action_pdf_port
            .expect_attach_calculation_js()
            .withf(|js, _, target_field| {
                js.contains("calculateSaveFromFields") && target_field == "save_modifier"
            })
            .times(1)
            .returning(|_, _, _| Ok(()));

        let service = ActionService::new(
            Arc::new(sheet_reference_port),
            Arc::new(sheet_storage_port),
            Arc::new(action_pdf_port),
        );

        let action = CalculationAction::SavingThrowModifier {
            ability_modifier_field_name: "ability_mod".to_string(),
            proficiency_field_name: "proficient".to_string(),
            proficiency_bonus_field_name: "prof_bonus".to_string(),
            saving_throw_modifier_field_name: "save_modifier".to_string(),
        };

        // Act
        let result = service.attach_calculation_script(&sheet_id, action).await;

        // Assert
        assert_eq!(result, Ok(()));
    }

    #[tokio::test]
    async fn test_should_attach_skill_modifier_calculation_script_with_optional_fields() {
        // Arrange
        let sheet_id = Uuid::new_v4();
        let sheet_path = PathBuf::from("/tmp/test-sheet.pdf");
        let sheet_reference = SheetReference::new(sheet_id, sheet_path.clone());

        let mut sheet_reference_port = MockSheetReferencePort::new();
        sheet_reference_port
            .expect_find_by_id()
            .times(1)
            .returning(move |_| Ok(sheet_reference.clone()));

        let mut sheet_storage_port = MockSheetStoragePort::new();
        sheet_storage_port
            .expect_read()
            .times(1)
            .returning(|path| Ok(path));

        let mut action_pdf_port = MockActionPdfPort::new();
        action_pdf_port
            .expect_add_doc_level_js()
            .times(1)
            .returning(|_, _| Ok(()));
        action_pdf_port
            .expect_attach_calculation_js()
            .withf(|js, _, target_field| {
                js.contains("calculateSkillFromFields")
                    && js.contains("undefined")
                    && target_field == "skill_mod"
            })
            .times(1)
            .returning(|_, _, _| Ok(()));

        let service = ActionService::new(
            Arc::new(sheet_reference_port),
            Arc::new(sheet_storage_port),
            Arc::new(action_pdf_port),
        );

        let action = CalculationAction::SkillModifier {
            ability_modifier_field_name: "ability_mod".to_string(),
            proficiency_field_name: "proficient".to_string(),
            expertise_field_name: None,
            half_prof_field_name: None,
            proficiency_bonus_field_name: "prof_bonus".to_string(),
            skill_modifier_field_name: "skill_mod".to_string(),
        };

        // Act
        let result = service.attach_calculation_script(&sheet_id, action).await;

        // Assert
        assert_eq!(result, Ok(()));
    }

    #[tokio::test]
    async fn test_should_attach_skill_modifier_calculation_script_with_all_fields() {
        // Arrange
        let sheet_id = Uuid::new_v4();
        let sheet_path = PathBuf::from("/tmp/test-sheet.pdf");
        let sheet_reference = SheetReference::new(sheet_id, sheet_path.clone());

        let mut sheet_reference_port = MockSheetReferencePort::new();
        sheet_reference_port
            .expect_find_by_id()
            .times(1)
            .returning(move |_| Ok(sheet_reference.clone()));

        let mut sheet_storage_port = MockSheetStoragePort::new();
        sheet_storage_port
            .expect_read()
            .times(1)
            .returning(|path| Ok(path));

        let mut action_pdf_port = MockActionPdfPort::new();
        action_pdf_port
            .expect_add_doc_level_js()
            .times(1)
            .returning(|_, _| Ok(()));
        action_pdf_port
            .expect_attach_calculation_js()
            .withf(|js, _, target_field| {
                js.contains("calculateSkillFromFields")
                    && js.contains(r#""expertise""#)
                    && js.contains(r#""half_prof""#)
                    && target_field == "skill_mod"
            })
            .times(1)
            .returning(|_, _, _| Ok(()));

        let service = ActionService::new(
            Arc::new(sheet_reference_port),
            Arc::new(sheet_storage_port),
            Arc::new(action_pdf_port),
        );

        let action = CalculationAction::SkillModifier {
            ability_modifier_field_name: "ability_mod".to_string(),
            proficiency_field_name: "proficient".to_string(),
            expertise_field_name: Some("expertise".to_string()),
            half_prof_field_name: Some("half_prof".to_string()),
            proficiency_bonus_field_name: "prof_bonus".to_string(),
            skill_modifier_field_name: "skill_mod".to_string(),
        };

        // Act
        let result = service.attach_calculation_script(&sheet_id, action).await;

        // Assert
        assert_eq!(result, Ok(()));
    }

    #[tokio::test]
    async fn test_should_return_error_when_sheet_not_found() {
        // Arrange
        let sheet_id = Uuid::new_v4();

        let mut sheet_reference_port = MockSheetReferencePort::new();
        sheet_reference_port
            .expect_find_by_id()
            .times(1)
            .returning(move |id| Err(ActionError::NotFound(*id)));

        let sheet_storage_port = MockSheetStoragePort::new();
        let action_pdf_port = MockActionPdfPort::new();

        let service = ActionService::new(
            Arc::new(sheet_reference_port),
            Arc::new(sheet_storage_port),
            Arc::new(action_pdf_port),
        );

        let action = CalculationAction::ability_modifier("score", "modifier");

        // Act
        let result = service.attach_calculation_script(&sheet_id, action).await;

        // Assert
        assert_eq!(result, Err(ActionError::NotFound(sheet_id)));
    }

    #[tokio::test]
    async fn test_should_return_error_when_sheet_storage_fails() {
        // Arrange
        let sheet_id = Uuid::new_v4();
        let sheet_path = PathBuf::from("/tmp/test-sheet.pdf");
        let sheet_reference = SheetReference::new(sheet_id, sheet_path.clone());

        let mut sheet_reference_port = MockSheetReferencePort::new();
        sheet_reference_port
            .expect_find_by_id()
            .times(1)
            .returning(move |_| Ok(sheet_reference.clone()));

        let mut sheet_storage_port = MockSheetStoragePort::new();
        sheet_storage_port
            .expect_read()
            .times(1)
            .returning(|_| Err(ActionError::InvalidAction("Storage error".to_string())));

        let action_pdf_port = MockActionPdfPort::new();

        let service = ActionService::new(
            Arc::new(sheet_reference_port),
            Arc::new(sheet_storage_port),
            Arc::new(action_pdf_port),
        );

        let action = CalculationAction::ability_modifier("score", "modifier");

        // Act
        let result = service.attach_calculation_script(&sheet_id, action).await;

        // Assert
        assert_eq!(
            result,
            Err(ActionError::InvalidAction("Storage error".to_string()))
        );
    }

    #[tokio::test]
    async fn test_should_return_error_when_pdf_port_fails() {
        // Arrange
        let sheet_id = Uuid::new_v4();
        let sheet_path = PathBuf::from("/tmp/test-sheet.pdf");
        let sheet_reference = SheetReference::new(sheet_id, sheet_path.clone());

        let mut sheet_reference_port = MockSheetReferencePort::new();
        sheet_reference_port
            .expect_find_by_id()
            .times(1)
            .returning(move |_| Ok(sheet_reference.clone()));

        let mut sheet_storage_port = MockSheetStoragePort::new();
        sheet_storage_port
            .expect_read()
            .times(1)
            .returning(|path| Ok(path));

        let mut action_pdf_port = MockActionPdfPort::new();
        action_pdf_port
            .expect_add_doc_level_js()
            .times(1)
            .returning(|_, _| Err(ActionError::InvalidAction("PDF error".to_string())));

        let service = ActionService::new(
            Arc::new(sheet_reference_port),
            Arc::new(sheet_storage_port),
            Arc::new(action_pdf_port),
        );

        let action = CalculationAction::ability_modifier("score", "modifier");

        // Act
        let result = service.attach_calculation_script(&sheet_id, action).await;

        // Assert
        assert_eq!(
            result,
            Err(ActionError::InvalidAction("PDF error".to_string()))
        );
    }
}
