import { describe, expect, it } from "vitest";
import type { Action } from "../../src/engine/build.ts";
import { moveWithTime, placeByTime } from "../../src/ui/editor/order.ts";

const at = (id: string, when: string): Action => ({ id, when, do: "event", note: "" });
const ids = (list: Action[]) => list.map((a) => a.id);

describe("action order by time", () => {
  const list = [at("a", "0:10"), at("b", "0:30"), at("c", "0:40"), at("d", "1:00")];
  const times = [10, 30, 40, 60];

  it("moves an action whose time changed after the last one that happens no later", () => {
    const changed = [...list];
    changed[1] = at("b", "0:50");
    const placed = placeByTime(changed, times, 1);
    expect(ids(placed.actions)).toEqual(["a", "c", "b", "d"]);
    expect(placed.index).toBe(2);
  });

  it("keeps the position while the time still fits between its neighbours", () => {
    const changed = [...list];
    changed[1] = at("b", "0:35");
    expect(placeByTime(changed, times, 1).index).toBe(1);
  });

  it("dropping a 0:30 action after a 0:40 one moves it to 0:40", () => {
    const moved = moveWithTime(list, times, 1, 2);
    expect(ids(moved)).toEqual(["a", "c", "b", "d"]);
    expect(moved[2]!.when).toBe("0:40");
  });

  it("dropping a 1:00 action before a 0:30 one moves it to 0:30", () => {
    const moved = moveWithTime(list, times, 3, 1);
    expect(ids(moved)).toEqual(["a", "d", "b", "c"]);
    expect(moved[1]!.when).toBe("0:30");
  });

  it("asap actions keep their mode when moved", () => {
    const mixed: Action[] = [
      at("a", "0:10"),
      { ...at("b", "0:00"), when: "asap" },
      at("c", "0:40"),
    ];
    const moved = moveWithTime(mixed, [10, 12, 40], 1, 2);
    expect(moved[2]!.when).toBe("asap");
  });
});
