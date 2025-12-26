function _calculateModifierFromScore(scoreField) {
  const score = getNumberValueFromField(scoreField);
  event.value = Math.floor((score - 10) / 2);
}

function _calculateSaveFromFields(
  abilityModField,
  proficientField,
  proficiencyBonusField
) {
  const mod = getNumberValueFromField(abilityModField);
  const prof = getBoolValueFromField(proficientField);
  const profBonus = getNumberValueFromField(proficiencyBonusField);
  event.value = mod + (prof ? profBonus : 0);
}

function _calculateSkillFromFields(
  abilityModField,
  proficientField,
  expertiseField,
  halfProfField,
  proficiencyBonusField
) {
  const abilityMod = getNumberValueFromField(abilityModField);
  const prof = getBoolValueFromField(proficientField);
  const ex = getBoolValueFromField(expertiseField);
  const half = getBoolValueFromField(halfProfField);
  const profBonus = getNumberValueFromField(proficiencyBonusField);
  const profMult = getProficiencyMultiplier(prof, ex, half);
  event.value = Math.floor(abilityMod + profMult * profBonus);
}

function getNumberValueFromField(fieldName) {
  const f = this.getField(fieldName);
  if (!f) {
    return 0;
  }
  const n = Number(f.value);
  return Number.isNaN(n) ? 0 : n;
}

function getBoolValueFromField(fieldName) {
  const f = this.getField(fieldName);
  if (!f) {
    return false;
  }
  const v = f.value;
  return v !== "Off" && v !== 0 && v !== "" && v != null;
}

function getProficiencyMultiplier(proficient, expertise, half) {
  if (expertise) {
    return 2;
  }
  if (proficient) {
    return 1;
  }
  if (half) {
    return 0.5;
  }

  return 0;
}
