import { useEffect, useState } from "preact/hooks";
import type { Build } from "../engine/build.ts";
import { decodeBuild, SHARED_ID } from "../io/share.ts";
import { navigate } from "./app.tsx";
import { useApp } from "./context.tsx";
import { Overview } from "./overview.tsx";
import { duplicateBuild } from "./sim.ts";
import { Svg } from "./svg.tsx";

/** A build opened from a share link: shown read-only, saved only when the user asks. */
export function SharedBuild({ code, onLoad }: { code: string; onLoad: (b: Build) => void }) {
  const api = useApp();
  const { t, data } = api;
  const [state, setState] = useState<"loading" | "ok" | { error: string }>("loading");

  useEffect(() => {
    let live = true;
    void decodeBuild(code, data).then((r) => {
      if (!live) return;
      if (!r.ok) {
        const error = r.newer ? t("import.newer", { version: r.newer }) : t("share.invalid");
        return setState({ error });
      }
      onLoad(r.build);
      setState("ok");
    });
    return () => {
      live = false;
    };
  }, [code]);

  if (state === "loading") return <div class="panel">{t("share.loading")}</div>;
  if (state !== "ok") {
    return (
      <div class="panel bg-error" data-testid="share-error">
        <p>
          <Svg name="error" /> {state.error}
        </p>
        <a class="btn" href="#/">
          {t("nav.back")}
        </a>
      </div>
    );
  }
  const shared = api.findBuild(SHARED_ID)?.build;
  return (
    <>
      <div class="panel share-banner row" data-testid="share-banner">
        <Svg name="link" />
        <span>
          {t("share.banner")}
          {shared?.author && <strong> · {shared.author}</strong>}
        </span>
        <span class="spacer" />
        <button
          class="btn primary"
          data-testid="share-save"
          onClick={() => {
            if (!shared) return;
            const copy = duplicateBuild(shared, "");
            api.saveBuild(copy);
            api.toast(t("share.saved"));
            navigate(`/view/${encodeURIComponent(copy.id)}`);
          }}
        >
          <Svg name="download" />
          {t("share.save")}
        </button>
      </div>
      <Overview id={SHARED_ID} />
    </>
  );
}
