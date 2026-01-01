import { describe, expect, it } from "vitest";
import {
  calculateModifier,
  calculateSaveBonus,
  calculateSkillBonus,
  getProficiencyMultiplier,
} from "../dnd-helpers.js";

describe("D&D Helper Functions", () => {
  describe("calculateModifier", () => {
    it.each`
      abilityScore | expected | description
      ${1}         | ${-5}    | ${"ability score 1"}
      ${2}         | ${-4}    | ${"ability score 2"}
      ${3}         | ${-4}    | ${"ability score 3"}
      ${4}         | ${-3}    | ${"ability score 4"}
      ${5}         | ${-3}    | ${"ability score 5"}
      ${6}         | ${-2}    | ${"ability score 6"}
      ${7}         | ${-2}    | ${"ability score 7"}
      ${8}         | ${-1}    | ${"ability score 8"}
      ${9}         | ${-1}    | ${"ability score 9"}
      ${10}        | ${0}     | ${"ability score 10"}
      ${11}        | ${0}     | ${"ability score 11"}
      ${12}        | ${1}     | ${"ability score 12"}
      ${13}        | ${1}     | ${"ability score 13"}
      ${14}        | ${2}     | ${"ability score 14"}
      ${15}        | ${2}     | ${"ability score 15"}
      ${16}        | ${3}     | ${"ability score 16"}
      ${17}        | ${3}     | ${"ability score 17"}
      ${18}        | ${4}     | ${"ability score 18"}
      ${19}        | ${4}     | ${"ability score 19"}
      ${20}        | ${5}     | ${"ability score 20"}
      ${21}        | ${5}     | ${"ability score 21"}
      ${22}        | ${6}     | ${"ability score 22"}
      ${23}        | ${6}     | ${"ability score 23"}
      ${24}        | ${7}     | ${"ability score 24"}
      ${25}        | ${7}     | ${"ability score 25"}
      ${26}        | ${8}     | ${"ability score 26"}
      ${27}        | ${8}     | ${"ability score 27"}
      ${28}        | ${9}     | ${"ability score 28"}
      ${29}        | ${9}     | ${"ability score 29"}
      ${30}        | ${10}    | ${"ability score 30"}
    `(
      "should return $expected for ability score $abilityScore ($description)",
      ({ abilityScore, expected }) => {
        expect(calculateModifier(abilityScore)).toBe(expected);
      }
    );
  });

  describe("getProficiencyMultiplier", () => {
    it.each`
      proficient | expertise | half     | expected | description
      ${false}   | ${false}  | ${false} | ${0}     | ${"not proficient"}
      ${false}   | ${false}  | ${true}  | ${0.5}   | ${"half proficiency e.g. Jack of All Trades"}
      ${true}    | ${false}  | ${false} | ${1}     | ${"standard proficiency"}
      ${false}   | ${true}   | ${false} | ${2}     | ${"expertise without proficiency flag"}
      ${true}    | ${true}   | ${false} | ${2}     | ${"expertise with proficiency"}
      ${true}    | ${false}  | ${true}  | ${1}     | ${"proficiency overrides half proficiency"}
      ${false}   | ${true}   | ${true}  | ${2}     | ${"expertise overrides half proficiency"}
      ${true}    | ${true}   | ${true}  | ${2}     | ${"expertise with all flags"}
    `(
      "should return $expected when proficient=$proficient, expertise=$expertise, half=$half ($description)",
      ({ proficient, expertise, half, expected }) => {
        expect(getProficiencyMultiplier(proficient, expertise, half)).toBe(
          expected
        );
      }
    );
  });

  describe("calculateSaveBonus", () => {
    it.each`
      modifier | proficient | proficiencyBonus | expected | description
      ${3}     | ${false}   | ${2}             | ${3}     | ${"just modifier when not proficient"}
      ${3}     | ${true}    | ${2}             | ${5}     | ${"modifier + proficiency when proficient"}
      ${-1}    | ${false}   | ${2}             | ${-1}    | ${"negative modifier without proficiency"}
      ${-1}    | ${true}    | ${2}             | ${1}     | ${"negative modifier with proficiency"}
      ${0}     | ${false}   | ${2}             | ${0}     | ${"zero modifier without proficiency"}
      ${0}     | ${true}    | ${2}             | ${2}     | ${"zero modifier with proficiency"}
      ${3}     | ${true}    | ${0}             | ${3}     | ${"zero proficiency bonus"}
      ${5}     | ${true}    | ${6}             | ${11}    | ${"high-level characters with large bonuses"}
    `(
      "should return $expected when modifier=$modifier, proficient=$proficient, proficiencyBonus=$proficiencyBonus ($description)",
      ({ modifier, proficient, proficiencyBonus, expected }) => {
        expect(calculateSaveBonus(modifier, proficient, proficiencyBonus)).toBe(
          expected
        );
      }
    );
  });

  describe("calculateSkillBonus", () => {
    it.each`
      modifier | proficient | expertise | half     | proficiencyBonus | expected | description
      ${3}     | ${false}   | ${false}  | ${false} | ${2}             | ${3}     | ${"just modifier when not proficient"}
      ${3}     | ${true}    | ${false}  | ${false} | ${2}             | ${5}     | ${"modifier + proficiency when proficient"}
      ${3}     | ${true}    | ${true}   | ${false} | ${2}             | ${7}     | ${"modifier + double proficiency with expertise"}
      ${3}     | ${false}   | ${false}  | ${true}  | ${2}             | ${4}     | ${"half proficiency bonus (Jack of All Trades)"}
      ${2}     | ${false}   | ${false}  | ${true}  | ${3}             | ${3}     | ${"floors result when half proficiency creates decimal"}
      ${-2}    | ${false}   | ${false}  | ${false} | ${2}             | ${-2}    | ${"negative modifier without proficiency"}
      ${-2}    | ${true}    | ${false}  | ${false} | ${2}             | ${0}     | ${"negative modifier with proficiency"}
      ${-2}    | ${true}    | ${true}   | ${false} | ${2}             | ${2}     | ${"negative modifier with expertise"}
      ${-2}    | ${false}   | ${false}  | ${true}  | ${2}             | ${-1}    | ${"negative modifier with half proficiency"}
      ${0}     | ${false}   | ${false}  | ${false} | ${2}             | ${0}     | ${"zero modifier without proficiency"}
      ${0}     | ${true}    | ${false}  | ${false} | ${2}             | ${2}     | ${"zero modifier with proficiency"}
      ${5}     | ${true}    | ${true}   | ${false} | ${6}             | ${17}    | ${"high-level characters with expertise"}
      ${4}     | ${false}   | ${false}  | ${true}  | ${5}             | ${6}     | ${"odd proficiency bonus with half proficiency"}
      ${3}     | ${true}    | ${true}   | ${true}  | ${2}             | ${7}     | ${"expertise overrides half proficiency flag"}
    `(
      "should return $expected when modifier=$modifier, proficient=$proficient, expertise=$expertise, half=$half, proficiencyBonus=$proficiencyBonus ($description)",
      ({
        modifier,
        proficient,
        expertise,
        half,
        proficiencyBonus,
        expected,
      }) => {
        expect(
          calculateSkillBonus(
            modifier,
            proficient,
            expertise,
            half,
            proficiencyBonus
          )
        ).toBe(expected);
      }
    );
  });
});
