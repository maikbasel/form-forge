use actix_multipart::form::{MultipartForm, json::Json, tempfile::TempFile};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use validator::{Validate, ValidationError};

fn validate_non_empty_binding_with<E>(
    map: &HashMap<Ability, String>,
    make_error: E,
) -> Result<(), ValidationError>
where
    E: Fn(&Ability) -> ValidationError,
{
    for (ability, val) in map {
        if val.trim().is_empty() {
            return Err(make_error(ability));
        }
    }
    Ok(())
}

fn validate_non_empty_ability_bindings(
    map: &HashMap<Ability, String>,
) -> Result<(), ValidationError> {
    validate_non_empty_binding_with(map, |ability| {
        let mut error = ValidationError::new("empty_ability_binding");
        error.add_param("ability".into(), &format!("{:?}", ability));
        error.message =
            Some(format!("Ability binding for `{:?}` must not be empty", ability).into());
        error
    })
}

fn validate_non_empty_saving_throws_bindings(
    map: &HashMap<Ability, String>,
) -> Result<(), ValidationError> {
    validate_non_empty_binding_with(map, |ability| {
        let mut error = ValidationError::new("empty_saving_throw_proficiency_binding");
        error.add_param("saving throw proficiency".into(), &format!("{:?}", ability));
        error.message = Some(
            format!(
                "Saving throw proficiency binding for `{:?}` must not be empty",
                ability
            )
            .into(),
        );
        error
    })
}

#[derive(Debug, Hash, Eq, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Skill {
    Acrobatics,
    AnimalHandling,
    Arcana,
    Athletics,
    Deception,
    History,
    Insight,
    Intimidation,
    Investigation,
    Medicine,
    Nature,
    Perception,
    Performance,
    Persuasion,
    Religion,
    SleightOfHand,
    Stealth,
    Survival,
}

#[derive(Debug, Hash, Eq, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Ability {
    Strength,
    Dexterity,
    Constitution,
    Intelligence,
    Wisdom,
    Charisma,
}

#[derive(Debug, Deserialize, Validate)]
pub struct SkillBinding {
    #[validate(length(min = 1))]
    pub skill: String,
    #[validate(length(min = 1))]
    pub prof: String,
    #[validate(length(min = 1))]
    pub expertise: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct Bindings {
    #[validate(length(min = 1))]
    pub proficiency_bonus: Option<String>,
    #[validate(custom(function = "validate_non_empty_ability_bindings"))]
    pub abilities: Option<HashMap<Ability, String>>,
    #[validate(custom(function = "validate_non_empty_saving_throws_bindings"))]
    pub saving_throws_proficiency: Option<HashMap<Ability, String>>,
    #[validate(nested)]
    pub skills_proficiency: Option<HashMap<Skill, SkillBinding>>,
}

#[derive(Debug, MultipartForm)]
pub struct SheetRequest {
    #[multipart(limit = "5MB")]
    pub sheet: TempFile,
    #[multipart(limit = "50KB")]
    pub bindings: Json<Bindings>,
}

mod tests {
    use super::*;

    #[test]
    fn should_not_pass_validation_if_abilities_contains_empty_binding_value() {
        let mut abilities = HashMap::new();
        abilities.insert(Ability::Strength, String::from(" "));
        let request = Bindings {
            proficiency_bonus: None,
            abilities: Some(abilities),
            saving_throws_proficiency: None,
            skills_proficiency: None,
        };

        let actual = request.validate();
        assert!(actual.is_err());
        let actual_error = actual.unwrap_err();
        let actual_field_errors = actual_error.field_errors();
        assert!(actual_field_errors.contains_key("abilities"));
        let actual_abilities_field_errors = actual_field_errors.get("abilities").unwrap();
        assert_eq!(actual_abilities_field_errors.len(), 1);

        let err = &actual_abilities_field_errors[0];
        assert_eq!(err.code, "empty_ability_binding");
        assert_eq!(
            err.message.as_deref(),
            Some("Ability binding for `Strength` must not be empty")
        );
        let ability_param = err
            .params
            .get("ability")
            .expect("ability param should be set");
        assert_eq!(ability_param.to_string(), "\"Strength\"");
    }

    #[test]
    fn should_not_pass_validation_if_saving_throws_proficiency_contains_empty_binding_value() {
        let mut saving_throws_proficiency = HashMap::new();
        saving_throws_proficiency.insert(Ability::Strength, String::from(" "));
        let request = Bindings {
            proficiency_bonus: None,
            abilities: None,
            saving_throws_proficiency: Some(saving_throws_proficiency),
            skills_proficiency: None,
        };

        let actual = request.validate();
        assert!(actual.is_err());
        let actual_error = actual.unwrap_err();
        let actual_field_errors = actual_error.field_errors();
        assert!(actual_field_errors.contains_key("saving_throws_proficiency"));
        let actual_abilities_field_errors = actual_field_errors
            .get("saving_throws_proficiency")
            .unwrap();
        assert_eq!(actual_abilities_field_errors.len(), 1);

        let err = &actual_abilities_field_errors[0];
        assert_eq!(err.code, "empty_saving_throw_proficiency_binding");
        assert_eq!(
            err.message.as_deref(),
            Some("Saving throw proficiency binding for `Strength` must not be empty")
        );
        let ability_param = err
            .params
            .get("saving throw proficiency")
            .expect("saving throw proficiency param should be set");
        assert_eq!(ability_param.to_string(), "\"Strength\"");
    }
}
