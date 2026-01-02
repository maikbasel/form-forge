/**
 * Calculate ability modifier from ability score
 * @param {number} score - The ability score (e.g., Strength, Dexterity)
 * @returns {number} The calculated modifier
 */
function calculateModifier(score) {
  return Math.floor((score - 10) / 2);
}

/**
 * Calculate save bonus from ability modifier and proficiency
 * @param {number} abilityMod - The ability modifier
 * @param {boolean} isProficient - Whether proficient in this save
 * @param {number} proficiencyBonus - The character's proficiency bonus
 * @returns {number} The calculated save bonus
 */
function calculateSaveBonus(abilityMod, isProficient, proficiencyBonus) {
  return abilityMod + (isProficient ? proficiencyBonus : 0);
}

/**
 * Calculate skill bonus from ability modifier and proficiency options
 * @param {number} abilityMod - The ability modifier
 * @param {boolean} proficient - Whether proficient in this skill
 * @param {boolean} expertise - Whether has expertise in this skill
 * @param {boolean} halfProf - Whether has half-proficiency (Jack of All Trades)
 * @param {number} proficiencyBonus - The character's proficiency bonus
 * @returns {number} The calculated skill bonus
 */
function calculateSkillBonus(
  abilityMod,
  proficient,
  expertise,
  halfProf,
  proficiencyBonus
) {
  const profMult = getProficiencyMultiplier(proficient, expertise, halfProf);
  return Math.floor(abilityMod + profMult * proficiencyBonus);
}

/**
 * Get proficiency multiplier based on proficiency type
 * @param {boolean} proficient - Whether proficient
 * @param {boolean} expertise - Whether has expertise (double proficiency)
 * @param {boolean} half - Whether has half proficiency
 * @returns {number} The proficiency multiplier (0, 0.5, 1, or 2)
 */
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

function calculateModifierFromScore(scoreField) {
  const score = getNumberValueFromField(scoreField);
  event.value = calculateModifier(score);
}

function calculateSaveFromFields(
  abilityModField,
  proficientField,
  proficiencyBonusField
) {
  const mod = getNumberValueFromField(abilityModField);
  const prof = getBoolValueFromField(proficientField);
  const profBonus = getNumberValueFromField(proficiencyBonusField);
  event.value = calculateSaveBonus(mod, prof, profBonus);
}

function calculateSkillFromFields(
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
  event.value = calculateSkillBonus(abilityMod, prof, ex, half, profBonus);
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

// Conditional exports for testing in Node.js (not executed in PDF environment)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateModifier,
    calculateSaveBonus,
    calculateSkillBonus,
    getProficiencyMultiplier,
  };
}
