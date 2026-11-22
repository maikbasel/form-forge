# Saving throws & skill checks

Once you've set up an ability modifier (see [Using Form Forge](index.md)),
saving throws and skill checks work the same way: click **New calculation**,
choose the type, and click the fields on the sheet in the order the panel asks
for them. They just need a few more fields, because they build on an ability
modifier and your proficiency.

Set up your ability modifiers first. Saving throws and skill checks read from
a modifier box, so that box needs its own calculation before these will give
the right answer.

!!! tip "Mark your proficiency bonus as Keep"
    Every saving throw and every skill uses the same proficiency bonus box.
    Click **Keep** on the Proficiency Bonus step once, and Form Forge fills it
    in for each following calculation of that type. Six saves or eighteen
    skills then take a few clicks each.

## Add a saving throw

A saving throw is your ability modifier, plus your proficiency bonus if you're
proficient in that save.

1. Click **New calculation** and choose **Saving Throw Modifier**.
2. Click the fields on the sheet in this order:

    | Step | The field to click |
    | --- | --- |
    | Target Saving Throw | the box that shows the save total |
    | Ability Modifier | the modifier box of the save's ability, e.g. Strength |
    | Proficiency Bonus | your proficiency bonus box |
    | Proficiency | the save's proficiency checkbox |

3. Click **Attach calculation**.

Now, when the proficiency box is checked, the save adds your proficiency bonus.
When it's unchecked, it uses the modifier alone.

## Add a skill check

A skill check works like a saving throw, but it targets a skill box and can
also handle expertise and half-proficiency.

1. Click **New calculation** and choose **Skill Modifier**.
2. Click the fields on the sheet in this order:

    | Step | The field to click |
    | --- | --- |
    | Target Skill | the box that shows the skill total |
    | Ability Modifier | the modifier box of the skill's ability, e.g. Wisdom for Perception |
    | Proficiency Bonus | your proficiency bonus box |
    | Proficiency | the skill's proficiency checkbox |
    | Expertise (optional) | the expertise checkbox, if your sheet has one |
    | Half-Prof (optional) | the Jack of All Trades checkbox, if your sheet has one |

3. Click **Attach calculation**.

!!! tip "Expertise and half-proficiency"
    A checkbox on the **Expertise** step doubles the proficiency bonus for that
    skill. One on the **Half-Prof** step (Jack of All Trades) adds half of it.
    If the skill doesn't use them, click **Skip** in the bar on the sheet.

For the full list of calculation types and the fields each one needs, see the
[calculation reference](../reference/index.md).
