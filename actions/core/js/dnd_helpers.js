function calculateModifierFromScore(scoreField) {
    var score = getNumberValueFromField(scoreField);
    event.value = Math.floor((score - 10) / 2);
}

function calculateSaveFromFields(abilityModField, proficientField, proficiencyBonusField) {
    var mod = getNumberValueFromField(abilityModField);
    var prof = getBoolValueFromField(proficientField);
    var profBonus = getNumberValueFromField(proficiencyBonusField);
    event.value = mod + (prof ? profBonus : 0);
}

function calculateSkillFromFields(abilityModField, proficientField, expertiseField, halfProfField, proficiencyBonusField) {
    var abilityMod = getNumberValueFromField(abilityModField);
    var prof = getBoolValueFromField(proficientField);
    var ex = getBoolValueFromField(expertiseField);
    var half = getBoolValueFromField(halfProfField);
    var profBonus = getNumberValueFromField(proficiencyBonusField);
    var profMult = getProficiencyMultiplier(prof, ex, half);
    event.value = Math.floor(abilityMod + (profMult * profBonus));
}

function getNumberValueFromField(fieldName) {
    var f = this.getField(fieldName);
    if (!f) return 0;
    var n = Number(f.value);
    return isNaN(n) ? 0 : n;
}

function getBoolValueFromField(fieldName) {
    var f = this.getField(fieldName);
    if (!f) return false;
    var v = f.value;
    return v !== "Off" && v !== 0 && v !== "" && v != null;
}

function getProficiencyMultiplier(proficient, expertise, half) {
    if (expertise) return 2;
    if (proficient) return 1;
    if (half) return 0.5;

    return 0;
}
