import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type ActionConfig,
  useCalculationBuilder,
} from "./calculation-panel.tsx";

const SKILL: ActionConfig = {
  id: "skill-modifier",
  name: "Skill Modifier",
  description: "",
  roles: [
    {
      key: "target",
      label: "Target Skill",
      hint: "",
      isTarget: true,
      required: true,
    },
    {
      key: "mod",
      label: "Ability Modifier",
      hint: "",
      isTarget: false,
      required: true,
    },
    {
      key: "prof",
      label: "Proficiency Bonus",
      hint: "",
      isTarget: false,
      required: true,
    },
    {
      key: "expertise",
      label: "Expertise",
      hint: "",
      isTarget: false,
      required: false,
    },
  ],
};

function setup() {
  const hook = renderHook(() => useCalculationBuilder([SKILL]));
  act(() => hook.result.current.choose("skill-modifier"));
  return hook;
}

const pick = (hook: ReturnType<typeof setup>, field: string) =>
  act(() => hook.result.current.pick(field));

const picks = (hook: ReturnType<typeof setup>) => {
  const { state } = hook.result.current;
  return state.status === "building" ? state.picks : {};
};

describe("useCalculationBuilder", () => {
  it("asks for the result field first and moves to the next empty step on each click", () => {
    const hook = setup();
    expect(hook.result.current.pickingRole?.key).toBe("target");

    pick(hook, "Athletics");
    expect(hook.result.current.pickingRole?.key).toBe("mod");
    pick(hook, "STRmod");
    pick(hook, "ProfBonus");

    expect(hook.result.current.pickingRole?.key).toBe("expertise");
    expect(hook.result.current.isReady).toBe(true);
  });

  it("moves a field to the active step when it was already picked for another", () => {
    const hook = setup();
    pick(hook, "Athletics");
    act(() => hook.result.current.activate(1));
    pick(hook, "Athletics");

    expect(picks(hook)).toEqual({ mod: "Athletics" });
    expect(hook.result.current.pickingRole?.key).toBe("prof");
  });

  it("skips optional steps only", () => {
    const hook = setup();
    act(() => hook.result.current.skip());
    expect(hook.result.current.pickingRole?.key).toBe("target");

    pick(hook, "Athletics");
    pick(hook, "STRmod");
    pick(hook, "ProfBonus");
    act(() => hook.result.current.skip());

    expect(hook.result.current.pickingRole).toBeUndefined();
  });

  it("keeps only the fields marked Keep after an attach and starts at the result field", () => {
    const hook = setup();
    pick(hook, "Athletics");
    pick(hook, "STRmod");
    pick(hook, "ProfBonus");
    act(() => hook.result.current.togglePin("prof"));
    act(() => hook.result.current.attached());

    expect(picks(hook)).toEqual({ prof: "ProfBonus" });
    expect(hook.result.current.pickingRole?.key).toBe("target");
    expect(hook.result.current.isReady).toBe(false);
  });

  it("locks the result field while editing and closes after saving", () => {
    const hook = renderHook(() => useCalculationBuilder([SKILL]));
    act(() =>
      hook.result.current.edit({
        id: "skill-modifier",
        name: "SkillModifier",
        endpoint: "actions",
        targetField: "Athletics",
        mapping: { target: "Athletics", mod: "STRmod", prof: "ProfBonus" },
      })
    );

    act(() => hook.result.current.activate(0));
    expect(hook.result.current.pickingRole).toBeUndefined();
    expect(hook.result.current.isReady).toBe(true);

    act(() => hook.result.current.attached());
    expect(hook.result.current.state.status).toBe("idle");
  });
});
