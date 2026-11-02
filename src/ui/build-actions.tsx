import type { Build } from "../engine/build.ts";
import { simulate } from "../engine/simulate.ts";
import { toDashboard } from "../io/dashboard.ts";
import { buildFileName, downloadText, exportPayload } from "../io/files.ts";
import { encodeBuild, shareUrl } from "../io/share.ts";
import { navigate } from "./app.tsx";
import { useApp } from "./context.tsx";
import { Tip } from "./icon.tsx";
import { Menu, MenuItem } from "./menu.tsx";
import { duplicateBuild } from "./sim.ts";
import { Svg } from "./svg.tsx";

export type BuildMode = "view" | "edit" | "play";

const MODES = [
  { id: "view", icon: "eye", route: "view", testid: "open-view" },
  { id: "edit", icon: "pencil", route: "build", testid: "open-edit" },
  { id: "play", icon: "clock", route: "play", testid: "open-match" },
] as const;

/** The three screens of a build (overview, editor, match) plus a menu of the other actions;
 *  shared by the library card and the build headers. */
export function BuildActions({
  build,
  readonly,
  current,
  showDuplicate = true,
  onDeleted,
}: {
  build: Build;
  readonly: boolean;
  /** The screen showing it, marked as current. */
  current?: BuildMode;
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
  /** The link carries the whole build: whoever opens it sees it and can save a copy. */
  const copyLink = async () => {
    const url = shareUrl(await encodeBuild(build));
    try {
      await navigator.clipboard.writeText(url);
      api.toast(t("share.copied"));
    } catch {
      window.prompt(t("share.copyManually"), url);
    }
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
      <span class="mode-links row" role="group">
        {MODES.filter((m) => !(readonly && m.id === "edit")).map((m) => {
          /** A standard build cannot change, so it has no edit screen (duplicate it instead). */
          const label = t(`mode.${m.id}`);
          return (
            <Tip
              key={m.id}
              label={`${label}
${t(`help.mode.${m.id}`)}`}
            >
              <a
                class="btn icon-only"
                href={`#/${m.route}/${id}`}
                aria-label={label}
                aria-current={current === m.id ? "page" : undefined}
                data-testid={m.testid}
              >
                <Svg name={m.icon} />
              </a>
            </Tip>
          );
        })}
      </span>
      <Menu label={t("editor.more")} testid="build-menu">
        {showDuplicate && (
          <MenuItem icon="copy" label={duplicateLabel} onClick={duplicate} testid="duplicate" />
        )}
        <MenuItem
          icon="link"
          label={t("share.copy")}
          onClick={() => void copyLink()}
          testid="share-link"
        />
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
