import { useMemo, useRef, useState } from "preact/hooks";
import type { PantheonId } from "../data/schema.ts";
import { BUILD_TYPES, type Build, type BuildType } from "../engine/build.ts";
import { formatClock } from "../engine/time.ts";
import { simulate } from "../engine/simulate.ts";
import { toDashboard } from "../io/dashboard.ts";
import {
  allBuildsFileName,
  buildFileName,
  downloadText,
  exportPayload,
  newBuildId,
  parseImport,
} from "../io/files.ts";
import { text } from "../i18n/index.ts";
import { navigate } from "./app.tsx";
import { useApp } from "./context.tsx";
import { EntityIcon, Tip, HelpText, useHelp } from "./icon.tsx";
import { duplicateBuild, newBuild } from "./sim.ts";
import { Svg } from "./svg.tsx";

function useAgeTimes(builds: Build[]) {
  const { data } = useApp();
  return useMemo(() => {
    const map = new Map<string, ReturnType<typeof simulate>["ageTimes"]>();
    for (const b of builds) {
      try {
        map.set(b.id, simulate(data, b).ageTimes);
      } catch {
        map.set(b.id, {});
      }
    }
    return map;
  }, [builds, data]);
}

function BuildCard({
  build,
  readonly,
  ages,
}: {
  build: Build;
  readonly: boolean;
  ages: ReturnType<typeof simulate>["ageTimes"];
}) {
  const api = useApp();
  const help = useHelp();
  const { t, data, locale } = api;
  const god = data.gods.get(build.god);
  const open = `#/build/${encodeURIComponent(build.id)}`;

  const exportOne = () => downloadText(buildFileName(build), exportPayload([build]));
  const exportDashboard = () => {
    const result = simulate(data, build);
    downloadText(
      `${buildFileName(build).replace(".aomr-bob.json", "")}.dashboard.json`,
      `${JSON.stringify(toDashboard(data, build, result), null, 2)}\n`,
    );
  };
  const duplicate = () => {
    const copy = duplicateBuild(build, readonly ? "" : `(${t("card.duplicate").toLowerCase()})`);
    api.saveBuild(copy);
    navigate(`/build/${encodeURIComponent(copy.id)}`);
  };
  const remove = async () => {
    const answer = await api.confirm(t("card.confirmDelete", { name: build.name }));
    if (answer === "yes") api.deleteBuild(build.id);
  };

  return (
    <article class={`card pan-${build.pantheon}`} data-testid="build-card">
      <div class="card-head">
        {god && <EntityIcon id={god.id} pantheon={build.pantheon} size={56} />}
        <div class="stack" style={{ gap: 4, minWidth: 0 }}>
          <a class="card-title" href={open}>
            {build.name}
          </a>
          <div class="row" style={{ gap: 6 }}>
            <EntityIcon id={build.pantheon} pantheon={build.pantheon} size={20} />
            <Tip label={help(`type.${build.type}`)} focusable>
              <span class={`type-tag type-${build.type}`}>{t(`type.${build.type}`)}</span>
            </Tip>
            {readonly && (
              <Tip label={t("card.readonly")} focusable>
                <Svg name="info" label={t("card.readonly")} />
              </Tip>
            )}
          </div>
        </div>
      </div>
      <div class="card-milestones">
        {(["classical", "heroic", "mythic"] as const).map((age) => {
          const time = ages[age];
          if (!time) return null;
          return (
            <span class="milestone-mini" key={age}>
              <EntityIcon
                id={age}
                pantheon={build.pantheon}
                size={22}
                detail={`${t("result.clicked")} ${formatClock(time.clicked)}`}
              />
              <span class="num">
                {time.reached !== undefined ? formatClock(time.reached) : formatClock(time.clicked)}
              </span>
            </span>
          );
        })}
      </div>
      {build.objective && <span class="action-times">{text(locale, build.objective)}</span>}
      {build.end && (
        <span
          class="row action-times"
          style={{ gap: 4, flexWrap: "nowrap", alignItems: "flex-start" }}
        >
          <Svg name="flag" />
          {text(locale, build.end)}
        </span>
      )}
      <div class="card-actions">
        <Tip label={t("card.open")}>
          <a class="btn icon-only" href={open} aria-label={t("card.open")}>
            <Svg name="chevron" />
          </a>
        </Tip>
        <Tip label={t("card.play")}>
          <a
            class="btn icon-only"
            href={`#/play/${encodeURIComponent(build.id)}`}
            aria-label={t("card.play")}
          >
            <Svg name="clock" />
          </a>
        </Tip>
        <Tip label={readonly ? t("card.duplicateToEdit") : t("card.duplicate")}>
          <button
            class="btn icon-only"
            onClick={duplicate}
            aria-label={readonly ? t("card.duplicateToEdit") : t("card.duplicate")}
            data-testid="duplicate"
          >
            <Svg name="copy" />
          </button>
        </Tip>
        <Tip label={t("card.export")}>
          <button
            class="btn icon-only"
            onClick={exportOne}
            aria-label={t("card.export")}
            data-testid="export-one"
          >
            <Svg name="download" />
          </button>
        </Tip>
        <Tip label={t("card.exportDashboard")}>
          <button
            class="btn icon-only"
            onClick={exportDashboard}
            aria-label={t("card.exportDashboard")}
          >
            <Svg name="monitor" />
          </button>
        </Tip>
        {!readonly && (
          <Tip label={t("card.delete")}>
            <button
              class="btn icon-only danger"
              onClick={remove}
              aria-label={t("card.delete")}
              data-testid="delete"
            >
              <Svg name="trash" />
            </button>
          </Tip>
        )}
      </div>
    </article>
  );
}

export function Library() {
  const api = useApp();
  const help = useHelp();
  const { t, data, builds, presets, locale } = api;
  const [pantheon, setPantheon] = useState<PantheonId | null>(null);
  const [god, setGod] = useState<string | null>(null);
  const [type, setType] = useState<BuildType | null>(null);
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const ages = useAgeTimes(useMemo(() => [...builds, ...presets], [builds, presets]));

  const filter = (b: Build) =>
    (!pantheon || b.pantheon === pantheon) && (!god || b.god === god) && (!type || b.type === type);

  const create = () => {
    const b = newBuild(data, t("library.new"), api.prefs.efficiency);
    api.saveBuild(b);
    navigate(`/build/${encodeURIComponent(b.id)}`);
  };

  const importFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const result = parseImport(await file.text(), data);
      if (!result.ok) {
        api.toast(
          result.newer
            ? t("import.newer", { version: result.newer })
            : t("import.error", { detail: result.error }),
          "error",
        );
        continue;
      }
      const accepted: Build[] = [];
      for (const b of result.builds) {
        const existing =
          builds.find((x) => x.id === b.id) ?? (b.id.startsWith("preset:") ? b : undefined);
        if (!existing) {
          accepted.push(b);
          continue;
        }
        const choice = await api.confirm(t("import.conflict", { name: b.name }), [
          { label: t("import.replace"), value: "replace", danger: true },
          { label: t("import.keepBoth"), value: "both" },
          { label: t("confirm.cancel"), value: "cancel" },
        ]);
        if (choice === "replace" && !b.id.startsWith("preset:")) accepted.push(b);
        if (choice === "both" || (choice === "replace" && b.id.startsWith("preset:"))) {
          accepted.push({
            ...b,
            id: newBuildId(),
            name: `${b.name} ${t("import.suffix")}`.slice(0, 80),
          });
        }
      }
      if (accepted.length) {
        api.addBuilds(accepted);
        api.toast(t("import.ok", { count: accepted.length }));
      }
    }
  };

  const pantheonList = data.common.pantheons.filter((p) => data.pantheons.has(p.id));
  const godList = [...data.gods.values()].filter((g) => !pantheon || g.pantheon === pantheon);
  const mine = builds.filter(filter);
  const standard = presets.filter(filter);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer?.files.length) void importFiles(e.dataTransfer.files);
      }}
    >
      <div class="toolbar">
        <button class="btn primary" onClick={create} data-testid="new-build">
          <Svg name="plus" />
          <HelpText k="library.new" />
        </button>
        <button class="btn" onClick={() => fileInput.current?.click()} data-testid="import">
          <Svg name="upload" />
          <HelpText k="library.import" />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          multiple
          hidden
          data-testid="import-input"
          onChange={(e) => {
            const input = e.currentTarget;
            if (input.files) void importFiles(input.files).then(() => (input.value = ""));
          }}
        />
        <button
          class="btn"
          disabled={builds.length === 0}
          onClick={() => downloadText(allBuildsFileName(), exportPayload(builds))}
          data-testid="export-all"
        >
          <Svg name="download" />
          <HelpText k="library.exportAll" />
        </button>
      </div>

      <div class="filters" role="group" aria-label={t("library.filters")}>
        <div class="filter-group">
          <button
            class="chip"
            aria-pressed={pantheon === null}
            onClick={() => {
              setPantheon(null);
              setGod(null);
            }}
          >
            <HelpText k="library.all" />
          </button>
          {pantheonList.map((p) => (
            <button
              key={p.id}
              class={`chip pan-chip pan-${p.id}`}
              aria-pressed={pantheon === p.id}
              data-testid={`filter-${p.id}`}
              onClick={() => {
                setPantheon(pantheon === p.id ? null : p.id);
                setGod(null);
              }}
            >
              <EntityIcon id={p.id} pantheon={p.id} size={32} tip={false} />
              {text(locale, p.name)}
            </button>
          ))}
        </div>
        <div class="filter-group">
          {godList.map((g) => (
            <Tip key={g.id} label={text(locale, g.name)}>
              <button
                class="portrait-btn"
                aria-pressed={god === g.id}
                aria-label={text(locale, g.name)}
                onClick={() => setGod(god === g.id ? null : g.id)}
              >
                <EntityIcon id={g.id} pantheon={g.pantheon} size={56} tip={false} />
              </button>
            </Tip>
          ))}
        </div>
        <div class="filter-group">
          {BUILD_TYPES.map((ty) => (
            <button
              key={ty}
              class="chip"
              aria-pressed={type === ty}
              onClick={() => setType(type === ty ? null : ty)}
            >
              <Tip label={help(`type.${ty}`)}>
                <span class={`type-tag type-${ty}`}>{t(`type.${ty}`)}</span>
              </Tip>
            </button>
          ))}
        </div>
      </div>

      <div class={`dropzone ${over ? "over" : ""}`}>
        <Svg name="upload" /> <HelpText k="library.drop" />
      </div>

      <section>
        <h2>
          <Svg name="user" />
          <HelpText k="library.mine" />
        </h2>
        {mine.length === 0 ? (
          <p class="action-times">{builds.length ? t("library.noMatch") : t("library.empty")}</p>
        ) : (
          <div class="cards" data-testid="my-builds">
            {mine.map((b) => (
              <BuildCard key={b.id} build={b} readonly={false} ages={ages.get(b.id) ?? {}} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>
          <Svg name="star" />
          <HelpText k="library.presets" />
        </h2>
        {standard.length === 0 ? (
          <p class="action-times">{t("library.noMatch")}</p>
        ) : (
          <div class="cards" data-testid="presets">
            {standard.map((b) => (
              <BuildCard key={b.id} build={b} readonly ages={ages.get(b.id) ?? {}} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
