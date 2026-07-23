# Saving throws & skill checks

Once you've set up an ability modifier (see [Using Form Forge](index.md)),
saving throws and skill checks follow the same three steps: pick the fields,
click **Configure Calculation**, and assign each field to its part. They just
need a few more fields, because they build on an ability modifier and your
proficiency.

Set up your ability modifiers first. Saving throws and skill checks read from
a modifier box, so that box needs its own calculation before these will give
the right answer.

## Add a saving throw

A saving throw is your ability modifier, plus your proficiency bonus if you're
proficient in that save.

1. Pick these fields on the sheet:
    - the **ability modifier** box the save uses (for a Strength save, that's
      `STRmod`)
    - your **proficiency bonus** box
    - the **proficiency checkbox** for that save
    - the **saving throw** box where the total should appear
2. Click **Configure Calculation** and choose **Saving Throw Modifier**.
3. Assign each picked field to its part:

    | Part | The field you pick |
    | --- | --- |
    | Ability Modifier | the modifier box, e.g. `STRmod` |
    | Proficiency Bonus | your proficiency bonus box |
    | Proficiency | the save's proficiency checkbox |
    | Target Saving Throw | the box that shows the save total |

4. Click **Attach Calculation**.

Now, when the proficiency box is checked, the save adds your proficiency bonus.
When it's unchecked, it uses the modifier alone.

## Add a skill check

A skill check works like a saving throw, but it targets a skill box and can
also handle expertise and half-proficiency.

1. Pick these fields on the sheet:
    - the **ability modifier** box the skill uses (for Perception, that's your
      Wisdom modifier)
    - your **proficiency bonus** box
    - the **proficiency checkbox** for that skill
    - the **skill** box where the total should appear
2. Click **Configure Calculation** and choose **Skill Modifier**.
3. Assign each picked field to its part:

    | Part | The field you pick |
    | --- | --- |
    | Ability Modifier | the modifier box, e.g. `WISmod` |
    | Proficiency Bonus | your proficiency bonus box |
    | Proficiency | the skill's proficiency checkbox |
    | Target Skill | the box that shows the skill total |

4. Click **Attach Calculation**.

!!! tip "Expertise and half-proficiency"
    A Skill Modifier also has optional **Expertise** and **Half-Prof** parts.
    Assign a checkbox to **Expertise** to double the proficiency bonus for
    that skill, or to **Half-Prof** (Jack of All Trades) to add half of it.
    Leave them unassigned if the skill doesn't use them.

For the full list of calculation types and the fields each one needs, see the
[calculation reference](../reference/index.md).
