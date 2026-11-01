import { useEffect, useRef, useState } from "preact/hooks";
import type { PantheonId } from "../data/schema.ts";
import { snapshotAt } from "../engine/format.ts";
import { formatClock } from "../engine/time.ts";
import type { Snapshot } from "../engine/types.ts";
import { BuildActions } from "./build-actions.tsx";
import { useApp } from "./context.tsx";
import { StepChips } from "./editor/result.tsx";
import { EntityIcon, Tip, HelpText, useHelp } from "./icon.tsx";
import { useSimulation } from "./sim.ts";
import { Svg } from "./svg.tsx";

function beep(ctx: AudioContext | null, freq = 880): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

const WORK = ["food", "wood", "gold", "favor", "build", "idle"] as const;

/** Where the villagers should be right now, and the population: to check the game against. */
function Workers({
  s,
  pantheon,
  favor,
}: {
  s: Snapshot | undefined;
  pantheon: PantheonId;
  favor: boolean;
}) {
  const { t } = useApp();
  const help = useHelp();
  const capped = s !== undefined && s.pop >= s.popCap;
  return (
    <aside class="panel match-eco" data-testid="match-eco">
      <h2 class="match-eco-title">
        <Tip label={help("match.workers")}>
          <span>{t("match.workers")}</span>
        </Tip>
        {s && <EntityIcon id={s.age} pantheon={pantheon} size={28} />}
      </h2>
      <ul class="match-eco-rows">
        {WORK.filter((k) => k !== "favor" || favor).map((k) => {
          const n = s?.alloc[k] ?? 0;
          const label = t(k === "build" ? "tl.building" : `res.${k}`);
          return (
            <li
              key={k}
              class={`match-eco-row eco-${k} ${k === "idle" && n > 0 ? "lvl-error" : ""}`}
              data-testid={`match-eco-${k}`}
            >
              {k === "build" ? (
                <Svg name="hammer" label={label} />
              ) : k === "idle" ? (
                <Svg name="pause" label={label} />
              ) : (
                <EntityIcon id={k} pantheon={pantheon} size={32} />
              )}
              <span class="match-eco-name">{label}</span>
              <span class="num match-eco-count">{n}</span>
            </li>
          );
        })}
      </ul>
      <div class={`match-eco-row match-pop ${capped ? "lvl-delay" : ""}`} data-testid="match-pop">
        <Svg name="users" label={t("result.pop")} />
        <span class="match-eco-name">{t("result.pop")}</span>
        <span class="num match-eco-count">{s ? `${s.pop}/${s.popCap}` : "—"}</span>
      </div>
    </aside>
  );
}

export function MatchMode({ id }: { id: string }) {
  const api = useApp();
  const { t, data, locale, prefs } = api;
  const found = api.findBuild(id);
  const sim = useSimulation(data, found?.build, locale);
  const countdown = prefs.countdown;
  const [elapsed, setElapsed] = useState(-countdown);
  const [running, setRunning] = useState(false);
  const sound = prefs.sound;
  const startRef = useRef<{ wall: number; base: number } | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const lastBeep = useRef<number>(-1);

  useEffect(() => {
    if (!running) return;
    startRef.current = { wall: performance.now(), base: elapsed };
    const timer = window.setInterval(() => {
      const s = startRef.current!;
      setElapsed(s.base + (performance.now() - s.wall) / 1000);
    }, 200);
    return () => window.clearInterval(timer);
  }, [running]);

  const steps = sim.steps;
  const now = Math.floor(elapsed);
  const currentIndex = steps.reduce((acc, s, i) => (s.seconds <= now ? i : acc), -1);
  const current = currentIndex >= 0 ? steps[currentIndex] : undefined;
  const upcoming = steps.slice(currentIndex + 1, currentIndex + 4);
  const next = upcoming[0];

  useEffect(() => {
    if (!running || !sound || !next) return;
    const until = next.seconds - elapsed;
    if (until <= 3 && until > 0 && lastBeep.current !== next.seconds) {
      lastBeep.current = next.seconds;
      beep(audio.current);
    }
  }, [elapsed, running, sound, next]);

  if (!found) {
    return (
      <div class="panel">
        <p>{t("editor.notFound")}</p>
      </div>
    );
  }
  const build = found.build;

  const shift = (delta: number) => {
    const value = elapsed + delta;
    setElapsed(value);
    if (startRef.current) startRef.current = { wall: performance.now(), base: value };
  };
  const toggle = () => {
    if (!audio.current && typeof AudioContext !== "undefined") {
      try {
        audio.current = new AudioContext();
      } catch {
        audio.current = null;
      }
    }
    setRunning(!running);
  };

  const series = sim.result?.series ?? [];
  const snap = snapshotAt(series, Math.max(0, elapsed));
  const favor = series.some((x) => (x.alloc.favor ?? 0) > 0);

  return (
    <div class="match" data-testid="match">
      <div class="row match-bar">
        <a class="btn" href={`#/view/${encodeURIComponent(build.id)}`} data-testid="match-back">
          <Svg name="chevron" />
          {build.name}
        </a>
        <span class="spacer" />
        <BuildActions build={build} readonly={found.readonly} current="play" />
        <Tip label={t("match.sound")}>
          <button
            class="btn icon-only"
            aria-pressed={sound}
            aria-label={t("match.sound")}
            onClick={() => api.setPrefs({ sound: !sound })}
          >
            <Svg name={sound ? "volume" : "mute"} />
          </button>
        </Tip>
      </div>
      <div class="panel match-controls">
        <div class="clock" data-testid="clock" aria-live="off">
          {elapsed < 0 ? `-${formatClock(-elapsed)}` : formatClock(Math.floor(elapsed))}
        </div>
        <button
          class="btn primary"
          onClick={toggle}
          data-testid="match-toggle"
          aria-label={running ? t("match.pause") : t("match.start")}
        >
          <Svg name={running ? "pause" : "play"} />
          {running ? t("match.pause") : t("match.start")}
        </button>
        <button class="btn" onClick={() => shift(-5)} data-testid="match-minus">
          {t("match.minus5")}
        </button>
        <button class="btn" onClick={() => shift(5)} data-testid="match-plus">
          {t("match.plus5")}
        </button>
        <Tip label={t("match.reset")}>
          <button
            class="btn icon-only"
            data-testid="match-reset"
            aria-label={t("match.reset")}
            onClick={() => {
              setRunning(false);
              setElapsed(-countdown);
              lastBeep.current = -1;
            }}
          >
            <Svg name="reset" />
          </button>
        </Tip>
        <label class="field match-countdown">
          <HelpText k="match.countdown" />
          <input
            class="small"
            type="number"
            min={0}
            max={60}
            value={countdown}
            onChange={(e) => {
              const v = Math.max(0, Math.min(60, Math.round(Number(e.currentTarget.value) || 0)));
              api.setPrefs({ countdown: v });
              if (!running && elapsed <= 0) setElapsed(-v);
            }}
          />
        </label>
      </div>
      <div class="match-body">
        <div class="match-steps">
          <section class="match-step now" data-testid="match-current">
            <div class="row match-step-head">
              <span class="match-step-label">
                <HelpText k="match.now" />
              </span>
              <span class="step-time num">{current?.t ?? "—"}</span>
            </div>
            {current ? (
              <StepChips build={build} step={current} large />
            ) : (
              <p class="match-empty">{t("match.notStarted")}</p>
            )}
          </section>
          <ol class="match-next" data-testid="match-next">
            {upcoming.map((step, k) => (
              <li key={step.seconds} class="match-step upcoming">
                <div class="row match-step-head">
                  {k === 0 && (
                    <span class="match-step-label">
                      <HelpText k="match.next" />
                    </span>
                  )}
                  <span class="step-time num">{step.t}</span>
                  <span class="num match-until">
                    −{formatClock(Math.max(0, step.seconds - elapsed))}
                  </span>
                </div>
                <StepChips build={build} step={step} large />
              </li>
            ))}
            {upcoming.length === 0 && (
              <li class="match-step upcoming match-empty">{t("match.done")}</li>
            )}
          </ol>
        </div>
        <Workers s={snap} pantheon={build.pantheon} favor={favor} />
      </div>
    </div>
  );
}
