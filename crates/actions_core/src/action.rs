use crate::error::ActionError;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct AttachedAction {
    pub id: Uuid,
    pub sheet_id: Uuid,
    pub action_type: String,
    pub target_field: String,
    pub mapping: serde_json::Value,
}

/// Metadata about a field role in an action type.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldRoleMetadata {
    pub key: String,
    pub required: bool,
    pub is_target: bool,
}

/// Metadata describing an available action type (powers frontend UI dynamically).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionTypeMetadata {
    /// Kebab-case identifier used as i18n key and frontend routing (e.g., "ability-modifier").
    pub id: String,
    /// PascalCase label matching the serde enum variant name (e.g., "AbilityModifier").
    pub action_label: String,
    /// Field roles defining the inputs/outputs for this action type.
    pub roles: Vec<FieldRoleMetadata>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all_fields = "camelCase")]
pub enum CalculationAction {
    AbilityModifier {
        #[serde(rename = "abilityScoreFieldName")]
        score_field_name: String,
        #[serde(rename = "abilityModifierFieldName")]
        modifier_field_name: String,
    },
    SavingThrowModifier {
        ability_modifier_field_name: String,
        proficiency_field_name: String,
        proficiency_bonus_field_name: String,
        saving_throw_modifier_field_name: String,
    },
    SkillModifier {
        ability_modifier_field_name: String,
        proficiency_field_name: String,
        expertise_field_name: Option<String>,
        half_prof_field_name: Option<String>,
        proficiency_bonus_field_name: String,
        skill_modifier_field_name: String,
    },
}

fn serialize_field_name(field_name: &str) -> Result<String, ActionError> {
    serde_json::to_string(field_name)
        .map_err(|e| ActionError::InvalidAction(format!("failed to serialize field name: {}", e)))
}

impl CalculationAction {
    /// Returns the persistence label matching the serde variant name.
    pub fn action_label(&self) -> &'static str {
        match self {
            Self::AbilityModifier { .. } => "AbilityModifier",
            Self::SavingThrowModifier { .. } => "SavingThrowModifier",
            Self::SkillModifier { .. } => "SkillModifier",
        }
    }

    /// Returns the name of the target field that the JS calculation attaches to.
    pub fn target_field(&self) -> &str {
        match self {
            Self::AbilityModifier {
                modifier_field_name,
                ..
            } => modifier_field_name,
            Self::SavingThrowModifier {
                saving_throw_modifier_field_name,
                ..
            } => saving_throw_modifier_field_name,
            Self::SkillModifier {
                skill_modifier_field_name,
                ..
            } => skill_modifier_field_name,
        }
    }

    /// Generates the JavaScript calculation code for this action.
    pub fn generate_js(&self) -> Result<String, ActionError> {
        match self {
            Self::AbilityModifier {
                score_field_name, ..
            } => {
                let score = serialize_field_name(score_field_name)?;
                Ok(format!("calculateModifierFromScore({});", score))
            }
            Self::SavingThrowModifier {
                ability_modifier_field_name,
                proficiency_field_name,
                proficiency_bonus_field_name,
                ..
            } => {
                let ability_mod = serialize_field_name(ability_modifier_field_name)?;
                let proficiency = serialize_field_name(proficiency_field_name)?;
                let prof_bonus = serialize_field_name(proficiency_bonus_field_name)?;
                Ok(format!(
                    "calculateSaveFromFields({}, {}, {});",
                    ability_mod, proficiency, prof_bonus
                ))
            }
            Self::SkillModifier {
                ability_modifier_field_name,
                proficiency_field_name,
                expertise_field_name,
                half_prof_field_name,
                proficiency_bonus_field_name,
                ..
            } => {
                let ability_mod = serialize_field_name(ability_modifier_field_name)?;
                let proficiency = serialize_field_name(proficiency_field_name)?;
                let expertise = match expertise_field_name {
                    Some(name) => serialize_field_name(name)?,
                    None => "undefined".to_string(),
                };
                let half_prof = match half_prof_field_name {
                    Some(name) => serialize_field_name(name)?,
                    None => "undefined".to_string(),
                };
                let prof_bonus = serialize_field_name(proficiency_bonus_field_name)?;
                Ok(format!(
                    "calculateSkillFromFields({}, {}, {}, {}, {});",
                    ability_mod, proficiency, expertise, half_prof, prof_bonus
                ))
            }
        }
    }

    /// Returns metadata for all registered action types.
    /// This powers the frontend UI dynamically — no frontend code changes needed for new actions.
    pub fn action_type_catalog() -> Vec<ActionTypeMetadata> {
        vec![
            ActionTypeMetadata {
                id: "ability-modifier".to_string(),
                action_label: "AbilityModifier".to_string(),
                roles: vec![
                    FieldRoleMetadata {
                        key: "abilityScoreFieldName".to_string(),
                        required: true,
                        is_target: false,
                    },
                    FieldRoleMetadata {
                        key: "abilityModifierFieldName".to_string(),
                        required: true,
                        is_target: true,
                    },
                ],
            },
            ActionTypeMetadata {
                id: "skill-modifier".to_string(),
                action_label: "SkillModifier".to_string(),
                roles: vec![
                    FieldRoleMetadata {
                        key: "abilityModifierFieldName".to_string(),
                        required: true,
                        is_target: false,
                    },
                    FieldRoleMetadata {
                        key: "proficiencyBonusFieldName".to_string(),
                        required: true,
                        is_target: false,
                    },
                    FieldRoleMetadata {
                        key: "proficiencyFieldName".to_string(),
                        required: true,
                        is_target: false,
                    },
                    FieldRoleMetadata {
                        key: "skillModifierFieldName".to_string(),
                        required: true,
                        is_target: true,
                    },
                    FieldRoleMetadata {
                        key: "expertiseFieldName".to_string(),
                        required: false,
                        is_target: false,
                    },
                    FieldRoleMetadata {
                        key: "halfProfFieldName".to_string(),
                        required: false,
                        is_target: false,
                    },
                ],
            },
            ActionTypeMetadata {
                id: "saving-throw-modifier".to_string(),
                action_label: "SavingThrowModifier".to_string(),
                roles: vec![
                    FieldRoleMetadata {
                        key: "abilityModifierFieldName".to_string(),
                        required: true,
                        is_target: false,
                    },
                    FieldRoleMetadata {
                        key: "proficiencyBonusFieldName".to_string(),
                        required: true,
                        is_target: false,
                    },
                    FieldRoleMetadata {
                        key: "proficiencyFieldName".to_string(),
                        required: true,
                        is_target: false,
                    },
                    FieldRoleMetadata {
                        key: "savingThrowModifierFieldName".to_string(),
                        required: true,
                        is_target: true,
                    },
                ],
            },
        ]
    }

    pub fn ability_modifier<S1: Into<String>, S2: Into<String>>(
        score_field_name: S1,
        modifier_field_name: S2,
    ) -> Self {
        Self::AbilityModifier {
            score_field_name: score_field_name.into(),
            modifier_field_name: modifier_field_name.into(),
        }
    }

    pub fn saving_throw_modifier<
        S1: Into<String>,
        S2: Into<String>,
        S3: Into<String>,
        S4: Into<String>,
    >(
        ability_modifier_field_name: S1,
        proficiency_field_name: S2,
        proficiency_bonus_field_name: S3,
        saving_throw_modifier_field_name: S4,
    ) -> Self {
        Self::SavingThrowModifier {
            ability_modifier_field_name: ability_modifier_field_name.into(),
            proficiency_field_name: proficiency_field_name.into(),
            proficiency_bonus_field_name: proficiency_bonus_field_name.into(),
            saving_throw_modifier_field_name: saving_throw_modifier_field_name.into(),
        }
    }

    pub fn skill_modifier<
        S1: Into<String>,
        S2: Into<String>,
        S3: Into<String>,
        S4: Into<String>,
        S5: Into<String>,
        S6: Into<String>,
    >(
        ability_modifier_field_name: S1,
        proficiency_field_name: S2,
        expertise_field_name: Option<S5>,
        half_prof_field_name: Option<S6>,
        proficiency_bonus_field_name: S3,
        skill_modifier_field_name: S4,
    ) -> Self {
        Self::SkillModifier {
            ability_modifier_field_name: ability_modifier_field_name.into(),
            proficiency_field_name: proficiency_field_name.into(),
            expertise_field_name: expertise_field_name.map(|s| s.into()),
            half_prof_field_name: half_prof_field_name.map(|s| s.into()),
            proficiency_bonus_field_name: proficiency_bonus_field_name.into(),
            skill_modifier_field_name: skill_modifier_field_name.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn test_ability_modifier_action_label() {
        let action = CalculationAction::ability_modifier("STR", "STR_mod");
        assert_eq!(action.action_label(), "AbilityModifier");
    }

    #[test]
    fn test_ability_modifier_target_field() {
        let action = CalculationAction::ability_modifier("STR", "STR_mod");
        assert_eq!(action.target_field(), "STR_mod");
    }

    #[test]
    fn test_ability_modifier_generate_js() {
        let action = CalculationAction::ability_modifier("STR", "STR_mod");
        let js = action.generate_js().unwrap();
        assert_eq!(js, r#"calculateModifierFromScore("STR");"#);
    }

    #[test]
    fn test_saving_throw_modifier_generate_js() {
        let action = CalculationAction::saving_throw_modifier(
            "ability_mod",
            "proficient",
            "prof_bonus",
            "save_modifier",
        );
        let js = action.generate_js().unwrap();
        assert_eq!(
            js,
            r#"calculateSaveFromFields("ability_mod", "proficient", "prof_bonus");"#
        );
    }

    #[test]
    fn test_skill_modifier_generate_js_with_optional_fields() {
        let action = CalculationAction::skill_modifier(
            "ability_mod",
            "proficient",
            None::<String>,
            None::<String>,
            "prof_bonus",
            "skill_mod",
        );
        let js = action.generate_js().unwrap();
        assert_eq!(
            js,
            r#"calculateSkillFromFields("ability_mod", "proficient", undefined, undefined, "prof_bonus");"#
        );
    }

    #[test]
    fn test_skill_modifier_generate_js_with_all_fields() {
        let action = CalculationAction::skill_modifier(
            "ability_mod",
            "proficient",
            Some("expertise"),
            Some("half_prof"),
            "prof_bonus",
            "skill_mod",
        );
        let js = action.generate_js().unwrap();
        assert_eq!(
            js,
            r#"calculateSkillFromFields("ability_mod", "proficient", "expertise", "half_prof", "prof_bonus");"#
        );
    }

    #[test]
    fn test_action_type_catalog_has_all_variants() {
        let catalog = CalculationAction::action_type_catalog();
        assert_eq!(catalog.len(), 3);
        assert_eq!(catalog[0].id, "ability-modifier");
        assert_eq!(catalog[1].id, "skill-modifier");
        assert_eq!(catalog[2].id, "saving-throw-modifier");
    }

    #[test]
    fn test_action_type_catalog_ability_modifier_roles() {
        let catalog = CalculationAction::action_type_catalog();
        let ability_mod = &catalog[0];
        assert_eq!(ability_mod.roles.len(), 2);
        assert_eq!(ability_mod.roles[0].key, "abilityScoreFieldName");
        assert!(ability_mod.roles[0].required);
        assert!(!ability_mod.roles[0].is_target);
        assert_eq!(ability_mod.roles[1].key, "abilityModifierFieldName");
        assert!(ability_mod.roles[1].is_target);
    }
}
