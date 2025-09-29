#[derive(Debug)]
pub enum CalculationAction {
    AbilityModifier {
        score_field_name: String,
        modifier_field_name: String,
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
}
