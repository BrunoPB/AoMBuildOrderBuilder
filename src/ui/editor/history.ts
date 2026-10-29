import { useRef, useState } from "preact/hooks";
import type { Build } from "../../engine/build.ts";

const LIMIT = 50;
const MERGE_MS = 1000;

/** Undo/redo for one build editing session; typing in the same field within a second is one step. */
export function useHistory() {
  const undoStack = useRef<Build[]>([]);
  const redoStack = useRef<Build[]>([]);
  const last = useRef<{ tag?: string; at: number }>({ at: 0 });
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  return {
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    /** Call with the state before a change. */
    record(previous: Build, tag?: string) {
      const now = Date.now();
      const merge =
        tag !== undefined && tag === last.current.tag && now - last.current.at < MERGE_MS;
      last.current = { tag, at: now };
      if (merge) return;
      undoStack.current = [...undoStack.current, previous].slice(-LIMIT);
      redoStack.current = [];
      bump();
    },
    undo(current: Build): Build | undefined {
      const previous = undoStack.current.at(-1);
      if (!previous) return undefined;
      undoStack.current = undoStack.current.slice(0, -1);
      redoStack.current = [...redoStack.current, current].slice(-LIMIT);
      last.current = { at: 0 };
      bump();
      return previous;
    },
    redo(current: Build): Build | undefined {
      const next = redoStack.current.at(-1);
      if (!next) return undefined;
      redoStack.current = redoStack.current.slice(0, -1);
      undoStack.current = [...undoStack.current, current].slice(-LIMIT);
      last.current = { at: 0 };
      bump();
      return next;
    },
  };
}
