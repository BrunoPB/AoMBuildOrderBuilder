import { useEffect, useRef, useState } from "preact/hooks";
import { formatClock } from "../engine/time.ts";
import { useApp } from "./context.tsx";
import { StepChips } from "./editor/result.tsx";
import { Tip, HelpText } from "./icon.tsx";
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
  const next = steps[currentIndex + 1];

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

  return (
    <div class="match" data-testid="match">
      <div class="row" style={{ alignSelf: "stretch", justifyContent: "space-between" }}>
        <a class="btn" href={`#/build/${encodeURIComponent(build.id)}`}>
          <Svg name="chevron" />
          {build.name}
        </a>
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
      <div class="clock" data-testid="clock" aria-live="off">
        {elapsed < 0 ? `-${formatClock(-elapsed)}` : formatClock(Math.floor(elapsed))}
      </div>
      <div class="match-controls">
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
        <button
          class="btn"
          data-testid="match-reset"
          onClick={() => {
            setRunning(false);
            setElapsed(-countdown);
            lastBeep.current = -1;
          }}
        >
          <Svg name="reset" />
          <HelpText k="match.reset" />
        </button>
        <label class="field">
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
      <div class="match-step now" data-testid="match-current">
        <div class="row">
          <span class="lvl-info">
            <HelpText k="match.now" />
          </span>
          <span class="step-time">{current?.t ?? "—"}</span>
          {current && (
            <span class="num">
              {current.pop} · {current.alloc}
            </span>
          )}
        </div>
        {current && <StepChips build={build} step={current} large />}
      </div>
      <div class="match-step" data-testid="match-next">
        <div class="row">
          <span class="lvl-info">
            <HelpText k="match.next" />
          </span>
          <span class="step-time">{next?.t ?? t("match.done")}</span>
          {next && <span class="num">−{formatClock(Math.max(0, next.seconds - elapsed))}</span>}
        </div>
        {next && <StepChips build={build} step={next} large />}
      </div>
    </div>
  );
}
