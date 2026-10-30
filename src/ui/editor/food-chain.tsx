import { useState } from "preact/hooks";
import type { SourceId } from "../../data/schema.ts";
import type { Build } from "../../engine/build.ts";
import { text } from "../../i18n/index.ts";
import { useApp } from "../context.tsx";
import { EntityIcon, HelpText, Tip, useHelp } from "../icon.tsx";
import { Svg } from "../svg.tsx";

type Drag = { from: "chain"; index: number } | { from: "pool"; id: SourceId };

/** Food sources in priority order: drag to reorder, drag in from (or back to) the pool,
 *  or use ← → on a focused source. */
export function FoodChain({
  build,
  chain,
  sources,
  readonly,
  custom,
  onChange,
}: {
  build: Build;
  chain: SourceId[];
  sources: SourceId[];
  readonly: boolean;
  custom: boolean;
  onChange: (chain: SourceId[] | undefined) => void;
}) {
  const { t, data, locale } = useApp();
  const help = useHelp();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<number | "pool" | null>(null);
  const name = (id: SourceId) => text(locale, data.sources.get(id)!.name);
  const pool = sources.filter((x) => !chain.includes(x));

  const end = () => {
    setDrag(null);
    setOver(null);
  };
  const dropAt = (at: number) => {
    if (!drag) return;
    const next = [...chain];
    if (drag.from === "chain") {
      const [item] = next.splice(drag.index, 1);
      next.splice(at > drag.index ? at - 1 : at, 0, item!);
    } else {
      next.splice(at, 0, drag.id);
    }
    onChange(next);
    end();
  };
  const dropOnPool = () => {
    if (drag?.from === "chain" && chain.length > 1)
      onChange(chain.filter((_, k) => k !== drag.index));
    end();
  };
  const move = (i: number, delta: number) => {
    const to = i + delta;
    if (to < 0 || to >= chain.length) return;
    const next = [...chain];
    [next[i], next[to]] = [next[to]!, next[i]!];
    onChange(next);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-testid="chain-${next[to]}"]`)?.focus(),
    );
  };

  return (
    <div class="field" style={{ gridColumn: "1 / -1" }}>
      <HelpText k="editor.foodChain" />
      <ol
        class={`food-chain ${over === chain.length ? "drop-end" : ""}`}
        aria-label={t("editor.foodChain")}
        data-testid="food-chain"
        onDragOver={(e) => {
          if (!drag || e.target !== e.currentTarget) return;
          e.preventDefault();
          setOver(chain.length);
        }}
        onDrop={(e) => {
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          dropAt(chain.length);
        }}
      >
        {chain.map((src, i) => (
          <li
            key={src}
            class={`chip chain-item ${over === i ? "drop-target" : ""} ${
              drag?.from === "chain" && drag.index === i ? "dragging" : ""
            }`}
            draggable={!readonly}
            tabIndex={readonly ? undefined : 0}
            aria-label={`${i + 1}. ${name(src)}`}
            data-testid={`chain-${src}`}
            onDragStart={(e) => {
              e.dataTransfer?.setData("text/plain", src);
              setDrag({ from: "chain", index: i });
            }}
            onDragOver={(e) => {
              if (!drag) return;
              e.preventDefault();
              setOver(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dropAt(i);
            }}
            onDragEnd={end}
            onKeyDown={(e) => {
              if (readonly) return;
              if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(i, -1);
              else if (e.key === "ArrowRight" || e.key === "ArrowDown") move(i, 1);
              else if ((e.key === "Delete" || e.key === "Backspace") && chain.length > 1)
                onChange(chain.filter((_, k) => k !== i));
              else return;
              e.preventDefault();
            }}
          >
            <Tip label={[name(src), help("editor.chainItem")].filter(Boolean).join("\n")}>
              <span class="chain-body">
                <span class="num chain-num">{i + 1}</span>
                <EntityIcon id={src} pantheon={build.pantheon} size={22} tip={false} />
              </span>
            </Tip>
            {!readonly && chain.length > 1 && (
              <button
                class="grip"
                tabIndex={-1}
                aria-label={`${t("row.remove")}: ${name(src)}`}
                onClick={() => onChange(chain.filter((_, k) => k !== i))}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ol>
      {!readonly && (
        <div
          class={`row chain-pool ${over === "pool" ? "drop-target" : ""}`}
          data-testid="food-pool"
          onDragOver={(e) => {
            if (drag?.from !== "chain") return;
            e.preventDefault();
            setOver("pool");
          }}
          onDrop={(e) => {
            e.preventDefault();
            dropOnPool();
          }}
        >
          {pool.map((x) => (
            <Tip key={x} label={name(x)}>
              <button
                class="chip"
                draggable
                aria-label={name(x)}
                data-testid={`pool-${x}`}
                onDragStart={(e) => {
                  e.dataTransfer?.setData("text/plain", x);
                  setDrag({ from: "pool", id: x });
                }}
                onDragEnd={end}
                onClick={() => onChange([...chain, x])}
              >
                <Svg name="plus" />
                <EntityIcon id={x} pantheon={build.pantheon} size={18} tip={false} />
              </button>
            </Tip>
          ))}
          {custom && (
            <button class="chip" onClick={() => onChange(undefined)}>
              {t("editor.reset")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
