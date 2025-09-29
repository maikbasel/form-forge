(function () {
    if (typeof this.DND === "object") return; // already loaded
    var doc = this; // Acrobat doc object

    var DND = {};

    /** Number value of a field, coercing empty/invalid → 0. */
    DND.num = function (fieldName) {
        var f = doc.getField(fieldName);
        if (!f) return 0;
        var n = Number(f.value);
        return isNaN(n) ? 0 : n;
    };

    /** Whether a checkbox/radio is checked (Acrobat uses "Off" for unchecked). */
    DND.checked = function (fieldName) {
        var f = doc.getField(fieldName);
        if (!f) return false;
        var v = f.value;
        return v !== "Off" && v !== 0 && v !== "" && v != null;
    };

    /** Clamp number to [min,max]. Non-numeric → 0 first. */
    DND.clamp = function (v, min, max) {
        v = Number(v) || 0;
        if (v < min) return min;
        if (v > max) return max;
        return v;
    };

    /** Ability modifier from a raw score. */
    DND.abilityModFromScore = function (score) {
        score = Number(score) || 0;
        return Math.floor((score - 10) / 2);
    };

    /** Ability modifier from a field name containing the raw score. */
    DND.abilityMod = function (scoreField) {
        return DND.abilityModFromScore(DND.num(scoreField));
    };

    /** Proficiency bonus from character level (1..20). */
    DND.profBonusFromLevel = function (level) {
        level = DND.clamp(Number(level) || 1, 1, 20);
        // floor((level - 1)/4) + 2 → 2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6
        return Math.floor((level - 1) / 4) + 2;
    };

    /**
     * Generic proficiency multiplier.
     * profLevel ∈ {0, 0.5, 1, 2} → none / half / proficient / expertise
     */
    DND.profMult = function (proficient, expertise, half) {
        // boolean flags → multiplier
        if (expertise) return 2;
        if (proficient) return 1;
        if (half) return 0.5;
        return 0;
    };

    /** Skill total = abilityMod + (mult * profBonus) + misc. */
    DND.skillTotal = function (abilityMod, profMult, profBonus, misc) {
        abilityMod = Number(abilityMod) || 0;
        profMult = Number(profMult) || 0;
        profBonus = Number(profBonus) || 0;
        misc = Number(misc) || 0;
        // Acrobat calc should return integers; 0.5 * PB can be .5 → round down per 5e.
        return Math.floor(abilityMod + (profMult * profBonus) + misc);
    };

    /** Saving throw = abilityMod + (proficient? PB:0) + misc. */
    DND.saveTotal = function (abilityMod, proficient, profBonus, misc) {
        return Math.floor((Number(abilityMod) || 0)
            + ((proficient ? 1 : 0) * (Number(profBonus) || 0))
            + (Number(misc) || 0));
    };

    /** Passive score = 10 + activeScore (e.g., Perception). */
    DND.passiveFromActive = function (active, misc) {
        active = Number(active) || 0;
        misc = Number(misc) || 0;
        return 10 + active + misc;
    };

    // ---------- convenience: field-driven recipes ----------
    /**
     * Compute a skill from field names.
     * Params:
     *  - abilityModField: text/number field holding the ability modifier (NOT score)
     *  - proficientField: checkbox "On/Off"
     *  - expertiseField:  checkbox "On/Off" (optional)
     *  - halfProfField:   checkbox "On/Off" (optional; e.g., Jack of All Trades)
     *  - profBonusField:  numeric field for PB
     *  - miscField:       optional numeric misc bonus field
     */
    DND.calcSkillFromFields = function (
        abilityModField,
        proficientField,
        expertiseField,
        halfProfField,
        profBonusField,
        miscField
    ) {
        var mod = DND.num(abilityModField);
        var pb = DND.num(profBonusField);
        var mult = DND.profMult(
            DND.checked(proficientField),
            expertiseField ? DND.checked(expertiseField) : false,
            halfProfField ? DND.checked(halfProfField) : false
        );
        var misc = miscField ? DND.num(miscField) : 0;
        return DND.skillTotal(mod, mult, pb, misc);
    };

    /**
     * Compute a save from field names.
     *  - abilityModField
     *  - proficientField
     *  - profBonusField
     *  - miscField (optional)
     */
    DND.calcSaveFromFields = function (
        abilityModField,
        proficientField,
        profBonusField,
        miscField
    ) {
        var mod = DND.num(abilityModField);
        var pb = DND.num(profBonusField);
        var prof = DND.checked(proficientField);
        var misc = miscField ? DND.num(miscField) : 0;
        return DND.saveTotal(mod, prof, pb, misc);
    };

    this.DND = DND;
}());