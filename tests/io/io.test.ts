import { describe, expect, it } from "vitest";
import { loadGameData } from "../../src/data/load.ts";
import { readRawData } from "../../src/data/raw-node.ts";
import { simulate } from "../../src/engine/simulate.ts";
import { toDashboard } from "../../src/io/dashboard.ts";
import { buildFileName, exportPayload, parseImport } from "../../src/io/files.ts";
import { readPresets } from "../../src/presets/node.ts";
import { BUILDS_KEY, Store } from "../../src/storage/index.ts";
import { migrateBuild } from "../../src/storage/migrate.ts";

const data = loadGameData(readRawData());
const krush = readPresets().find((b) => b.id === "preset:krush")!;

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

describe("export and import", () => {
  it("round-trips a build", () => {
    const own = { ...krush, id: "u-test" };
    const result = parseImport(exportPayload([own]), data);
    expect(result).toEqual({ ok: true, builds: [own] });
  });

  it("names files after the god and the build", () => {
    expect(buildFileName(krush)).toBe("kronos-krush.aomr-bob.json");
  });

  it("rejects invalid files without side effects", () => {
    expect(parseImport("not json", data).ok).toBe(false);
    expect(parseImport(JSON.stringify({ format: "other" }), data).ok).toBe(false);
    const bad = {
      ...krush,
      actions: [{ when: "0:00", do: "train" as const, unit: "no-such-unit" }],
    };
    const r = parseImport(exportPayload([bad]), data);
    expect(r.ok).toBe(false);
  });

  it("refuses files from a newer version", () => {
    const r = parseImport(JSON.stringify({ format: "aomr-bob", version: 99, builds: [] }), data);
    expect(r).toMatchObject({ ok: false, newer: 99 });
  });

  it("accepts a single build object", () => {
    const r = parseImport(JSON.stringify(krush), data);
    expect(r.ok).toBe(true);
  });

  it("exports the dashboard format with JSON-string fields", () => {
    const d = toDashboard(data, krush, simulate(data, krush));
    expect(d.name).toBe("Krush");
    expect(d.pantheon).toBe("Atlantes");
    expect(d.dlc).toBe(false);
    const steps = JSON.parse(d.steps) as { t: string; actions: { text: string }[] }[];
    expect(steps[0]!.t).toBe("0:00");
    expect(JSON.parse(d.matchups)).toHaveLength(krush.matchups!.length);
  });
});

describe("storage", () => {
  it("saves and loads builds", () => {
    const store = new Store(new MemoryStorage());
    store.saveBuilds([krush]);
    expect(store.loadBuilds()).toEqual([krush]);
  });

  it("keeps working in memory when localStorage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    const store = new Store(broken);
    expect(store.saveBuilds([krush])).toBe(false);
    expect(store.ok).toBe(false);
    expect(store.loadBuilds()).toEqual([krush]);
  });

  it("drops corrupt entries", () => {
    const storage = new MemoryStorage();
    storage.setItem(BUILDS_KEY, JSON.stringify([{ nope: true }, krush]));
    expect(new Store(storage).loadBuilds()).toEqual([krush]);
  });

  it("validates versions on load", () => {
    expect(migrateBuild({ ...krush, version: 4 })).toMatchObject({ ok: false, newer: 4 });
    expect(migrateBuild({ ...krush, version: 0 }).ok).toBe(false);
  });

  it("migrates version 1 auto queue and train-when-affordable to train modes", () => {
    const v1 = {
      ...krush,
      version: 1,
      actions: [
        { when: "0:00", do: "autoTrain", unit: "citizen", rally: "food" },
        { when: "always", do: "trainWhenAffordable", unit: "turma", from: "counter-barracks" },
        { when: "5:00", do: "stopAutoTrain", unit: "citizen" },
        { when: "5:00", do: "stopTrainWhenAffordable" },
      ],
      milestones: [],
    };
    const r = migrateBuild(v1);
    expect(r.ok && r.build.actions).toEqual([
      { when: "0:00", do: "train", mode: "auto", unit: "citizen", rally: "food" },
      { when: "always", do: "train", mode: "affordable", unit: "turma", at: "counter-barracks" },
      { when: "5:00", do: "stopTrain", mode: "auto", unit: "citizen" },
      { when: "5:00", do: "stopTrain", mode: "affordable" },
    ]);
  });

  it("migrates the build-wide reserve window into each 'when affordable' action", () => {
    const v2 = {
      ...krush,
      version: 2,
      settings: { efficiency: 0.9, affordableWindow: 60 },
      actions: [
        { when: "always", do: "train", mode: "affordable", unit: "turma" },
        { when: "always", do: "train", mode: "affordable", unit: "promethean", window: 10 },
        { when: "0:00", do: "train", mode: "auto", unit: "citizen" },
      ],
      milestones: [],
    };
    const r = migrateBuild(v2);
    expect(r.ok && r.build.settings).toEqual({ efficiency: 0.9 });
    expect(r.ok && r.build.actions.map((a) => ("window" in a ? a.window : undefined))).toEqual([
      60,
      10,
      undefined,
    ]);
  });

  it("defaults preferences", () => {
    expect(new Store(new MemoryStorage()).loadPrefs()).toMatchObject({
      theme: "system",
      sound: true,
      view: {},
    });
  });

  it("keeps remembered screen state", () => {
    const store = new Store(new MemoryStorage());
    store.savePrefs({
      ...store.loadPrefs(),
      view: { "actions.events": false, "palette.age": null },
    });
    expect(store.loadPrefs().view).toEqual({ "actions.events": false, "palette.age": null });
  });
});
