import { describe, expect, it } from "vitest";
import { simulate } from "../../src/engine/simulate.ts";
import type { Build } from "../../src/engine/build.ts";
import { testBuild, testData } from "./fixture.ts";

const data = testData();
const run = (actions: Build["actions"], settings?: Build["settings"]) =>
  simulate(data, testBuild(actions, settings));
const at = (r: ReturnType<typeof run>, t: number) => r.series.find((s) => s.t === t)!;

describe("gathering", () => {
  it("gathers workers × rate × efficiency / 60 per second", () => {
    const r = run([
      { when: "0:00", do: "move", count: 2, from: "idle", to: "wood" },
      { when: "0:10", do: "event", note: "end" },
    ]);
    expect(at(r, 10).resources.wood).toBeCloseTo(120);
    expect(at(r, 10).alloc.wood).toBe(2);
  });

  it("warns when starting workers stay idle until the end", () => {
    const idle = run([{ when: "0:20", do: "event", note: "end" }]);
    const w = idle.warnings.find((x) => x.key === "warn.idleUntilEnd");
    expect(w?.params.count).toBe(at(idle, 0).alloc.idle);
    expect(w?.t).toBe(0);
    const busy = run([
      { when: "0:00", do: "move", count: at(idle, 0).alloc.idle, from: "idle", to: "wood" },
      { when: "0:20", do: "event", note: "end" },
    ]);
    expect(busy.warnings.some((x) => x.key === "warn.idleUntilEnd")).toBe(false);
  });

  it("applies efficiency", () => {
    const r = run(
      [
        { when: "0:00", do: "move", count: 2, from: "idle", to: "wood" },
        { when: "0:10", do: "event", note: "end" },
      ],
      { efficiency: 0.5 },
    );
    expect(at(r, 10).resources.wood).toBeCloseTo(110);
  });

  it("moves workers to the next food source when one is depleted", () => {
    const r = run(
      [
        { when: "0:00", do: "move", count: 2, from: "idle", to: "food" },
        { when: "0:20", do: "event", note: "end" },
      ],
      { sourceAmounts: { hunt: 20 } },
    );
    expect(
      r.warnings.some(
        (w) =>
          w.key === "warn.sourceDepleted" && w.level === "attention" && w.params.source === "hunt",
      ),
    ).toBe(true);
    expect(r.events.some((e) => e.kind === "sourceDepleted" && e.next === "berries")).toBe(true);
    expect(at(r, 20).resources.food).toBeCloseTo(240);
  });

  it("ignores what happens after the build ends (the tail is only context)", () => {
    const r = run(
      [
        { when: "0:00", do: "move", count: 2, from: "idle", to: "food" },
        { when: "0:05", do: "event", note: "end" },
      ],
      { sourceAmounts: { hunt: 20 }, tail: 30 },
    );
    expect(r.buildEnd).toBe(5);
    expect(r.events.some((e) => e.kind === "sourceDepleted" && e.t > 5)).toBe(true);
    expect(r.warnings.filter((w) => w.t > r.buildEnd)).toEqual([]);
  });
});

describe("after another action", () => {
  it("starts when that action ends, or when it starts with on: start", () => {
    const r = run([
      { when: "0:00", do: "move", count: 3, from: "idle", to: "wood" },
      { id: "b", when: "0:00", do: "build", building: "manor" },
      { when: { after: "b" }, do: "event", note: "done" },
      { when: { after: "b", on: "start", delay: 2 }, do: "event", note: "started" },
    ]);
    expect(r.actions[1]!.completedAt).toBeGreaterThan(r.actions[1]!.startedAt! + 2);
    expect(r.actions[2]!.startedAt).toBe(r.actions[1]!.completedAt);
    expect(r.actions[3]!.startedAt).toBe(r.actions[1]!.startedAt! + 2);
  });
});

describe("payment", () => {
  it("waits for resources, never goes negative, and reports the delay", () => {
    const r = run([
      { when: "0:00", do: "move", count: 2, from: "idle", to: "food" },
      { id: "cl", when: "0:00", do: "age", to: "classical", minor: "minor-a" },
    ]);
    expect(r.ageTimes.classical?.clicked).toBe(50);
    expect(r.ageTimes.classical?.reached).toBe(80);
    const delay = r.warnings.find((w) => w.key === "warn.noResource");
    expect(delay).toMatchObject({ level: "delay", params: { resource: "food", waited: 50 } });
    expect(Math.min(...r.series.map((s) => s.resources.food))).toBeGreaterThanOrEqual(0);
  });

  it("an asap action that waits for resources starts when it can, without a delay", () => {
    const r = run([
      { when: "0:00", do: "move", count: 2, from: "idle", to: "food" },
      { id: "cl", when: "asap", do: "age", to: "classical", minor: "minor-a" },
    ]);
    expect(r.ageTimes.classical?.clicked).toBe(50);
    const wait = r.warnings.find((w) => w.key === "warn.noResource");
    expect(wait).toMatchObject({ level: "info", params: { resource: "food", waited: 50 } });
    expect(r.warnings.filter((w) => w.level === "delay")).toEqual([]);
  });

  it("explains a resource wait: cost, stock at the start and other spends", () => {
    const r = run([
      { when: "0:00", do: "move", count: 2, from: "idle", to: "wood" },
      { when: "0:00", do: "build", building: "barracks" },
      { when: "0:00", do: "build", building: "manor" },
      { when: "0:00", do: "train", mode: "auto", unit: "soldier" },
      { when: "0:00", do: "build", building: "temple" },
    ]);
    const w = r.warnings.find((x) => x.key === "warn.noResource" && x.action === 4);
    expect(w?.detail).toMatchObject({ resource: "wood", need: 50, have: 0 });
    expect(w?.params.missing).toBe(50);
    const spent = w?.detail?.spent ?? [];
    expect(spent.length).toBeGreaterThan(0);
    expect(spent.every((x) => x.action === 3 && x.cost.wood === 20)).toBe(true);
    expect(spent.every((x) => x.t >= w!.detail!.since && x.t <= w!.t)).toBe(true);
  });
});

describe("queues and population", () => {
  it("trains one unit at a time per building", () => {
    const r = run([{ when: "0:00", do: "train", unit: "citizen", count: 3, rally: "wood" }]);
    expect(r.produced.map((p) => p.t)).toEqual([10, 20, 30]);
    expect(at(r, 30).alloc.wood).toBe(3);
  });

  it("waits for population space and resumes when a house is built", () => {
    const r = run([
      { when: "0:00", do: "event", gainResource: { food: 1000 } },
      { when: "0:00", do: "train", unit: "citizen", count: 8 },
      { when: "1:30", do: "build", building: "manor", builder: { from: "idle" } },
    ]);
    const citizens = r.produced.filter((p) => p.unit === "citizen").map((p) => p.t);
    expect(citizens).toEqual([10, 20, 30, 40, 50, 60, 70, 120]);
    expect(r.warnings.find((w) => w.key === "warn.popCapped")?.params.waited).toBe(40);
    expect(at(r, 120).popCap).toBe(20);
  });

  it("frees population when units are lost", () => {
    const r = run([
      { when: "0:00", do: "train", unit: "citizen" },
      { when: "0:20", do: "event", lose: { citizen: 2 } },
    ]);
    expect(at(r, 19).pop).toBe(4);
    expect(at(r, 20).pop).toBe(2);
  });
});

describe("modifiers", () => {
  it("applies the Kronos build bonus only after the first manor is ready", () => {
    const r = run([
      { when: "0:00", do: "event", gainResource: { wood: 200 } },
      { id: "b1", when: "0:00", do: "build", building: "barracks", builder: { from: "idle" } },
      { id: "m", when: "0:00", do: "build", building: "manor", builder: { from: "idle" } },
      { id: "b2", when: "0:30", do: "build", building: "barracks", builder: { same: "m" } },
    ]);
    expect(r.actions[1]!.completedAt).toBe(20);
    expect(r.actions[3]!.completedAt).toBe(40);
  });

  it("applies research effects after completion", () => {
    const r = run([
      { when: "0:00", do: "event", gainResource: { food: 300, wood: 100 } },
      { id: "cl", when: "0:00", do: "age", to: "classical", minor: "minor-a" },
      {
        id: "ar",
        when: { after: "cl" },
        do: "build",
        building: "armory",
        builder: { from: "idle" },
        then: "idle",
      },
      { id: "ax", when: { after: "ar" }, do: "research", research: "axes" },
      { when: { after: "ax" }, do: "move", count: 2, from: "idle", to: "wood" },
      { when: { after: "ax", delay: 10 }, do: "event", note: "end" },
    ]);
    const done = r.actions[3]!.completedAt!;
    expect(done).toBe(50);
    expect(at(r, done + 10).resources.wood - at(r, done).resources.wood).toBeCloseTo(40);
  });

  it("flags low-confidence data", () => {
    const r = run([
      { when: "0:00", do: "build", building: "barracks", builder: { from: "idle" } },
      { when: "asap", do: "train", unit: "soldier" },
    ]);
    expect(r.warnings.some((w) => w.key === "warn.lowConfidenceData" && w.action === 1)).toBe(true);
  });
});

describe("age ups, powers and promotions", () => {
  it("grants free myth units of the minor god (Kronos) and minor free units", () => {
    const r = run([
      { when: "0:00", do: "event", gainResource: { food: 400, wood: 10 } },
      { id: "cl", when: "0:00", do: "age", to: "classical", minor: "minor-a" },
      {
        id: "ar",
        when: { after: "cl" },
        do: "build",
        building: "armory",
        builder: { from: "idle" },
      },
      { when: { after: "ar" }, do: "age", to: "heroic", minor: "minor-b" },
    ]);
    const ageDone = r.events.filter((e) => e.kind === "ageDone");
    expect(ageDone[0]).toMatchObject({ t: 30, free: { beast: 2 } });
    expect(ageDone[1]).toMatchObject({ t: 70, free: { citizen: 1 } });
    expect(at(r, 30).pop).toBe(3 + 4);
  });

  it("time shift makes a building unavailable for its full base build time", () => {
    const r = run([
      { when: "0:00", do: "event", gainResource: { wood: 200 } },
      { id: "m", when: "0:00", do: "build", building: "manor", builder: { from: "idle" } },
      { id: "b", when: { after: "m" }, do: "build", building: "barracks", builder: { same: "m" } },
      { id: "ts", when: { after: "b" }, do: "timeShift", building: "barracks" },
      { when: "asap", do: "train", unit: "soldier" },
    ]);
    expect(r.actions[2]!.completedAt).toBe(30);
    expect(r.actions[3]!.completedAt).toBe(50);
    expect(r.produced.find((p) => p.unit === "soldier")?.t).toBe(55);
  });

  it("limits power uses and grants resources", () => {
    const r = run([
      { when: "0:00", do: "power", power: "bounty" },
      { when: "0:05", do: "power", power: "bounty" },
    ]);
    expect(at(r, 1).resources.gold).toBe(200);
    expect(r.warnings.some((w) => w.key === "warn.powerNoUses" && w.level === "error")).toBe(true);
  });

  it("promotes an oracle, paying favor and raising its favor rate", () => {
    const r = run([
      { when: "0:20", do: "promote", unit: "oracle" },
      { when: "0:40", do: "event", note: "end" },
    ]);
    expect(at(r, 20).resources.favor).toBeCloseTo(1);
    expect(at(r, 40).resources.favor).toBeCloseTo(4);
  });
});

describe("continuous rules", () => {
  it("an auto queue keeps the building busy for its duration", () => {
    const r = run([
      { when: "0:00", do: "event", gainResource: { food: 1000 } },
      { when: "0:00", do: "train", mode: "auto", unit: "citizen", rally: "wood", duration: 35 },
    ]);
    // the unit started at 0:30 still finishes; none starts after 0:35
    expect(r.produced.map((p) => p.t)).toEqual([10, 20, 30, 40]);
    expect(r.events.some((e) => e.kind === "trainOff" && e.t === 35 && e.action === 1)).toBe(true);
  });

  it("an auto queue without 'until' runs to the end of the build", () => {
    const made = (duration?: number) =>
      run([
        { when: "0:00", do: "event", gainResource: { food: 1000 } },
        { when: "0:00", do: "train", mode: "auto", unit: "citizen", rally: "wood", duration },
        { when: "0:35", do: "event", note: "end" },
      ]).produced.length;
    expect(made(15)).toBe(2);
    expect(made()).toBe(4);
  });

  it("the duration counts from when the queue starts, not from 0:00", () => {
    const r = run([
      { when: "0:00", do: "event", gainResource: { food: 1000 } },
      { when: "0:20", do: "train", mode: "auto", unit: "citizen", rally: "wood", duration: 15 },
    ]);
    expect(r.events.some((e) => e.kind === "trainOff" && e.t === 35)).toBe(true);
  });
});

describe("errors and determinism", () => {
  it("reports a missing requirement as an error", () => {
    const r = run([{ when: "0:00", do: "build", building: "armory", builder: { from: "idle" } }]);
    expect(r.warnings.find((w) => w.level === "error")?.key).toBe("warn.missingRequirement");
  });

  it("is deterministic and works with a 0.1 s tick", () => {
    const actions: Build["actions"] = [
      { when: "0:00", do: "move", count: 2, from: "idle", to: "food" },
      { when: "0:00", do: "train", unit: "citizen", count: 2 },
      { when: "asap", do: "age", to: "classical", minor: "minor-a" },
    ];
    expect(run(actions)).toEqual(run(actions));
    const fine = run(actions, { tick: 0.1 });
    const coarse = run(actions);
    expect(
      Math.abs(fine.ageTimes.classical!.clicked - coarse.ageTimes.classical!.clicked),
    ).toBeLessThanOrEqual(1);
  });
});

describe("trickles, caps and pop modifiers", () => {
  it("adds resources per minute while a power lasts", () => {
    const r = run([
      { when: "0:00", do: "power", power: "harvest" },
      { when: "0:20", do: "event", note: "end" },
    ]);
    expect(at(r, 10).resources.food).toBeCloseTo(210);
    expect(at(r, 20).resources.food).toBeCloseTo(210);
  });

  it("caps stored favor", () => {
    const r = simulate(
      testData({ favorCap: 3 }),
      testBuild([{ when: "1:00", do: "event", note: "end" }]),
    );
    expect(Math.max(...r.series.map((s) => s.resources.favor))).toBeLessThanOrEqual(3);
  });

  it("applies pop modifiers to units", () => {
    const d = testData();
    d.gods
      .get("kronos")!
      .modifiers.push({ target: "pop", op: "add", value: -1, scope: { tags: ["myth"] } });
    const r = simulate(
      d,
      testBuild([
        { when: "0:00", do: "event", gainResource: { food: 300 } },
        { when: "0:00", do: "age", to: "classical", minor: "minor-a" },
      ]),
    );
    expect(at(r, 30).pop).toBe(3 + 2);
  });
});

describe("population counted when units leave the building", () => {
  it("holds a finished unit inside the building until there is room", () => {
    const r = run(
      [
        { when: "0:00", do: "event", gainResource: { food: 1000 } },
        { when: "0:00", do: "train", unit: "citizen", count: 8 },
        { when: "1:30", do: "build", building: "manor", builder: { from: "idle" } },
      ],
      { popReservedAt: "end" },
    );
    const citizens = r.produced.filter((p) => p.unit === "citizen").map((p) => p.t);
    expect(citizens).toEqual([10, 20, 30, 40, 50, 60, 70, 110]);
    expect(r.warnings.find((w) => w.key === "warn.popCapped")?.params.waited).toBe(30);
  });
});

describe("hero promotion", () => {
  it("stops the villager while it is promoted", () => {
    const r = run([
      { when: "0:00", do: "event", gainFavor: 5 },
      { when: "0:00", do: "move", count: 2, from: "idle", to: "wood" },
      { when: "0:00", do: "promote", unit: "citizen" },
      { when: "0:10", do: "event", note: "end" },
    ]);
    expect(at(r, 2).alloc.busy).toBe(1);
    expect(at(r, 10).resources.wood).toBeCloseTo(120);
  });
});

describe("production spans", () => {
  it("records what each building is doing over time", () => {
    const r = run([
      { when: "0:00", do: "event", gainResource: { wood: 100 } },
      { when: "0:00", do: "train", unit: "citizen", count: 2 },
      { id: "b", when: "0:00", do: "build", building: "barracks", builder: { from: "idle" } },
      { when: { after: "b" }, do: "timeShift", building: "barracks" },
    ]);
    const { lanes, spans } = r.production;
    const tc = lanes.find((l) => l.building === "town-center")!;
    expect(
      spans.filter((s) => s.lane === tc.uid).map((s) => [s.kind, s.id, s.start, s.end]),
    ).toEqual([
      ["unit", "citizen", 0, 10],
      ["unit", "citizen", 10, 20],
    ]);
    const barracks = lanes.find((l) => l.building === "barracks")!;
    expect(
      spans.filter((s) => s.lane === barracks.uid).map((s) => [s.kind, s.start, s.end]),
    ).toEqual([
      ["build", 0, 20],
      ["shift", 20, 40],
    ]);
  });

  it("marks a unit held inside the building by the population cap", () => {
    const r = run(
      [
        { when: "0:00", do: "event", gainResource: { food: 1000 } },
        { when: "0:00", do: "train", unit: "citizen", count: 8 },
        { when: "1:30", do: "build", building: "manor", builder: { from: "idle" } },
      ],
      { popReservedAt: "end" },
    );
    const last = r.production.spans.filter((s) => s.kind === "unit").at(-1)!;
    expect(last).toMatchObject({ start: 70, held: 80, end: 110 });
  });
});
