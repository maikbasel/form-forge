# Calculation reference

Form Forge ships three calculation types. Each one reads from some fields and
writes its result into a target field. This page lists the fields (called
"roles") each type needs, in the order Form Forge asks for them, and the
formula it applies. For a step-by-step walk,
see [Using Form Forge](../players/index.md) and
[Saving throws & skill checks](../players/calculations.md).

All calculations follow standard D&D 5e math.

## Ability Modifier

Calculates an ability modifier from an ability score.

**Formula:** `modifier = floor((score - 10) / 2)`

| Role | Required | What it is |
| --- | --- | --- |
| Target Modifier | yes | Where the calculated modifier appears |
| Ability Score | yes | The ability score it comes from, e.g. Strength |

## Saving Throw Modifier

Calculates a saving throw from an ability modifier and proficiency.

**Formula:** `save = abilityModifier + (proficient ? proficiencyBonus : 0)`

| Role | Required | What it is |
| --- | --- | --- |
| Target Saving Throw | yes | Where the save total appears |
| Ability Modifier | yes | The modifier of the save's ability |
| Proficiency Bonus | yes | The character's proficiency bonus |
| Proficiency | yes | Checkbox indicating proficiency in this save |

## Skill Modifier

Calculates a skill check from an ability modifier and proficiency, with support
for expertise and half-proficiency.

**Formula:** `skill = floor(abilityModifier + proficiencyMultiplier * proficiencyBonus)`

The proficiency multiplier is `2` with expertise, `1` when proficient, `0.5`
with half-proficiency, and `0` otherwise.

| Role | Required | What it is |
| --- | --- | --- |
| Target Skill | yes | Where the skill total appears |
| Ability Modifier | yes | The modifier of the skill's ability, e.g. Wisdom for Perception |
| Proficiency Bonus | yes | The character's proficiency bonus |
| Proficiency | yes | Checkbox indicating proficiency in this skill |
| Expertise | no | Checkbox for double proficiency (expertise) |
| Half-Prof | no | Checkbox for half proficiency (Jack of All Trades) |
