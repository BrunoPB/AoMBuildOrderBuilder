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

  it("migrates version 5: population always counts at the end of training (no setting)", () => {
    const old = { ...krush, version: 5, settings: { popReservedAt: "start", efficiency: 0.9 } };
    const r = migrateBuild(old);
    expect(r.ok && r.build.settings).toEqual({ efficiency: 0.9 });
  });

  it("validates versions on load", () => {
    expect(migrateBuild({ ...krush, version: 8 })).toMatchObject({ ok: false, newer: 8 });
    expect(migrateBuild({ ...krush, version: 0 }).ok).toBe(false);
  });

  it("migrates version 1 auto queue and train-when-affordable to auto queues with an end", () => {
    const v1 = {
      ...krush,
      version: 1,
      actions: [
        { when: "0:00", do: "autoTrain", unit: "citizen", rally: "food" },
        { when: "always", do: "trainWhenAffordable", unit: "turma", from: "counter-barracks" },
        { when: "5:00", do: "stopAutoTrain", unit: "citizen" },
        { when: "6:00", do: "stopTrainWhenAffordable" },
      ],
      milestones: [],
    };
    const r = migrateBuild(v1);
    expect(r.ok && r.build.actions).toEqual([
      {
        id: "a1",
        when: "0:00",
        do: "train",
        mode: "auto",
        unit: "citizen",
        rally: "food",
        duration: 300,
      },
      {
        id: "a2",
        // "always" is gone: from the start
        when: "0:00",
        do: "train",
        mode: "auto",
        unit: "turma",
        at: "counter-barracks",
        until: "6:00",
      },
    ]);
  });

  it("drops stop actions: a timed one becomes the queues' 'until', references are fixed", () => {
    const v3 = {
      ...krush,
      version: 3,
      settings: {},
      actions: [
        { id: "a", when: "0:00", do: "train", mode: "affordable", unit: "turma", window: 60 },
        { id: "b", when: "0:00", do: "train", mode: "auto", unit: "citizen" },
        { id: "c", when: "0:00", do: "train", mode: "auto", unit: "oracle" },
        { id: "s1", when: "3:00", do: "stopTrain", mode: "affordable", unit: "turma" },
        { id: "s2", when: "4:00", do: "stopTrain", mode: "auto", unit: "citizen" },
        { id: "s3", when: { after: "b" }, do: "stopTrain", mode: "auto" },
        { id: "x", when: { after: "s2" }, do: "event", note: "after the stop" },
      ],
      milestones: [{ id: "m", atAction: "s1" }],
    };
    const r = migrateBuild(v3);
    expect(r.ok && r.build.actions).toEqual([
      { id: "a", when: "0:00", do: "train", mode: "auto", unit: "turma", duration: 180 },
      { id: "b", when: "0:00", do: "train", mode: "auto", unit: "citizen", duration: 240 },
      // a stop without a fixed time cannot become a time: the queue runs to the end
      { id: "c", when: "0:00", do: "train", mode: "auto", unit: "oracle" },
      {
        id: "x",
        when: { after: "c", on: "start", asap: true },
        do: "event",
        note: "after the stop",
      },
    ]);
    expect(r.ok && r.build.milestones).toEqual([]);
  });

  it("turns an auto queue's end time into a duration when its start is fixed", () => {
    const v4 = {
      ...krush,
      version: 4,
      actions: [
        { when: "1:00", do: "train", mode: "auto", unit: "citizen", until: "3:30" },
        { when: "asap", do: "train", mode: "auto", unit: "turma", until: "5:00" },
      ],
      milestones: [],
    };
    const r = migrateBuild(v4);
    expect(r.ok && r.build.actions).toEqual([
      { id: "a1", when: "1:00", do: "train", mode: "auto", unit: "citizen", duration: 150 },
      // the start is only known after simulating: the editor converts it
      {
        id: "a2",
        when: { after: "a1", on: "start", asap: true },
        do: "train",
        mode: "auto",
        unit: "turma",
        until: "5:00",
      },
    ]);
  });

  it("drops the old build-wide reserve window", () => {
    const v2 = {
      ...krush,
      version: 2,
      settings: { efficiency: 0.9, affordableWindow: 60 },
      actions: [{ when: "always", do: "train", mode: "affordable", unit: "turma" }],
      milestones: [],
    };
    const r = migrateBuild(v2);
    expect(r.ok && r.build.settings).toEqual({ efficiency: 0.9 });
    expect(r.ok && r.build.actions).toEqual([
      { id: "a1", when: "0:00", do: "train", mode: "auto", unit: "turma" },
    ]);
  });

  it("'as soon as possible' names the action it waits on: the one before it, from its start", () => {
    const v6 = {
      ...krush,
      version: 6,
      actions: [
        { when: "asap", do: "event", note: "first" },
        { id: "b", when: "0:30", do: "event", note: "" },
        { when: "asap", do: "event", note: "" },
        { when: "always", do: "event", note: "" },
      ],
      milestones: [],
    };
    const r = migrateBuild(v6);
    expect(r.ok && r.build.actions.map((a) => [a.id, a.when])).toEqual([
      ["a1", "0:00"],
      ["b", "0:30"],
      ["a2", { after: "b", on: "start", asap: true }],
      ["a3", "0:00"],
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
