import type { Build } from "../engine/build.ts";
import { simulate } from "../engine/simulate.ts";
import { toDashboard } from "../io/dashboard.ts";
import { buildFileName, downloadText, exportPayload } from "../io/files.ts";
import { navigate } from "./app.tsx";
import { useApp } from "./context.tsx";
import { Tip } from "./icon.tsx";
import { Menu, MenuItem } from "./menu.tsx";
import { duplicateBuild } from "./sim.ts";
import { Svg } from "./svg.tsx";

/** Play button plus a menu of the other actions; shared by the library card and the build header. */
export function BuildActions({
  build,
  readonly,
  showDuplicate = true,
  onDeleted,
}: {
  build: Build;
  readonly: boolean;
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
      <Menu label={t("editor.more")} testid="build-menu">
        {showDuplicate && (
          <MenuItem icon="copy" label={duplicateLabel} onClick={duplicate} testid="duplicate" />
        )}
        <MenuItem
          icon="download"
          label={t("card.export")}
          onClick={exportOne}
          testid="export-one"
        />
        <MenuItem
          icon="monitor"
          label={t("card.exportDashboard")}
          onClick={exportDashboard}
          testid="export-dashboard"
        />
        {!readonly && (
          <MenuItem
            icon="trash"
            label={t("card.delete")}
            onClick={() => void remove()}
            danger
            testid="delete"
          />
        )}
      </Menu>
    </div>
  );
}
