#[derive(Debug)]
pub enum CalculationAction {
    AbilityModifier {
        score_field_name: String,
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

impl CalculationAction {
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
