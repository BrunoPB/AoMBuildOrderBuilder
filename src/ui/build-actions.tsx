import type { Build } from "../engine/build.ts";
import { simulate } from "../engine/simulate.ts";
import { toDashboard } from "../io/dashboard.ts";
import { buildFileName, downloadText, exportPayload } from "../io/files.ts";
import { navigate } from "./app.tsx";
import { useApp } from "./context.tsx";
import { Tip } from "./icon.tsx";
import { duplicateBuild } from "./sim.ts";
import { Svg } from "./svg.tsx";

/** Icon buttons shared by the library card and the build screen header. */
export function BuildActions({
  build,
  readonly,
  showOpen = false,
  showDuplicate = true,
  onDeleted,
}: {
  build: Build;
  readonly: boolean;
  showOpen?: boolean;
  showDuplicate?: boolean;
  onDeleted?: () => void;
}) {
  const api = useApp();
  const { t, data } = api;
  const id = encodeURIComponent(build.id);

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
    if (answer !== "yes") return;
    api.deleteBuild(build.id);
    onDeleted?.();
  };
  const duplicateLabel = readonly ? t("card.duplicateToEdit") : t("card.duplicate");

  return (
    <div class="card-actions" role="toolbar" aria-label={build.name}>
      {showOpen && (
        <Tip label={t("card.open")}>
          <a class="btn icon-only" href={`#/build/${id}`} aria-label={t("card.open")}>
            <Svg name="chevron" />
          </a>
        </Tip>
      )}
      <Tip label={t("card.play")}>
        <a
          class="btn icon-only"
          href={`#/play/${id}`}
          aria-label={t("card.play")}
          data-testid="open-match"
        >
          <Svg name="clock" />
        </a>
      </Tip>
      {showDuplicate && (
        <Tip label={duplicateLabel}>
          <button
            class="btn icon-only"
            onClick={duplicate}
            aria-label={duplicateLabel}
            data-testid="duplicate"
          >
            <Svg name="copy" />
          </button>
        </Tip>
      )}
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
          data-testid="export-dashboard"
        >
          <Svg name="monitor" />
        </button>
      </Tip>
      {!readonly && (
        <Tip label={t("card.delete")}>
          <button
            class="btn icon-only danger"
            onClick={() => void remove()}
            aria-label={t("card.delete")}
            data-testid="delete"
          >
            <Svg name="trash" />
          </button>
        </Tip>
      )}
    </div>
  );
}
