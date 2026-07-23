# Calculation reference

Form Forge ships three calculation types. Each one reads from some fields and
writes its result into a target field. This page lists the fields (called
"roles") each type needs and the formula it applies. For a step-by-step walk,
see [Using Form Forge](../players/index.md) and
[Saving throws & skill checks](../players/calculations.md).

All calculations follow standard D&D 5e math.

## Ability Modifier

Calculates an ability modifier from an ability score.

**Formula:** `modifier = floor((score - 10) / 2)`

| Role | Required | What it is |
| --- | --- | --- |
| Ability Score | yes | The base ability score, e.g. `STR`, `DEX` |
| Target Modifier | yes | Where the calculated modifier appears |

## Saving Throw Modifier

Calculates a saving throw from an ability modifier and proficiency.

**Formula:** `save = abilityModifier + (proficient ? proficiencyBonus : 0)`

| Role | Required | What it is |
| --- | --- | --- |
| Ability Modifier | yes | The relevant ability modifier field |
| Proficiency Bonus | yes | The character's proficiency bonus |
| Proficiency | yes | Checkbox indicating proficiency in this save |
| Target Saving Throw | yes | Where the save total appears |

## Skill Modifier

Calculates a skill check from an ability modifier and proficiency, with support
for expertise and half-proficiency.

**Formula:** `skill = floor(abilityModifier + proficiencyMultiplier * proficiencyBonus)`

The proficiency multiplier is `2` with expertise, `1` when proficient, `0.5`
with half-proficiency, and `0` otherwise.

| Role | Required | What it is |
| --- | --- | --- |
| Ability Modifier | yes | The relevant ability modifier field, e.g. `WISmod` for Perception |
| Proficiency Bonus | yes | The character's proficiency bonus |
| Proficiency | yes | Checkbox indicating proficiency in this skill |
| Target Skill | yes | Where the skill total appears |
| Expertise | no | Checkbox for double proficiency (expertise) |
| Half-Prof | no | Checkbox for half proficiency (Jack of All Trades) |
