import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import { isGatherer, taskTargets } from "../../src/ui/editor/labels.ts";

const data = loadGameData(readRawData());

describe("action field options", () => {
  it("only gatherers have a rally target", () => {
    expect(isGatherer(data, "atlanteans", "citizen")).toBe(true);
    expect(isGatherer(data, "atlanteans", "promethean")).toBe(false);
  });

  it("targets follow what the unit gathers", () => {
    expect(taskTargets(data, "greeks", "fishing-ship")).toEqual(["food", "fish", "idle"]);
    const villager = taskTargets(data, "greeks", "villager");
    expect(villager).toContain("favor");
    expect(villager).not.toContain("fish");
  });
});
