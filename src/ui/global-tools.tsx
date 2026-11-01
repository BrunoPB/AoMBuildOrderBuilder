import { useApp } from "./context.tsx";
import { Tip } from "./icon.tsx";
import { Svg } from "./svg.tsx";

/** Storage warning, language and settings: in the top bar, or in the build header when the
 *  build screen takes the whole window. `home` adds the library link. */
export function GlobalTools({ home }: { home?: boolean }) {
  const { t, locale, storageOk, setPrefs } = useApp();
  return (
    <>
      {!storageOk && (
        <Tip label={t("storage.unavailable")} focusable>
          <span class="lvl-delay" data-testid="storage-warning">
            <Svg name="warning" label={t("storage.unavailable")} />
          </span>
        </Tip>
      )}
      <Tip label={t("settings.language")}>
        <button
          class="btn"
          data-testid="toggle-locale"
          onClick={() => setPrefs({ locale: locale === "pt-BR" ? "en" : "pt-BR" })}
          aria-label={t("settings.language")}
        >
          <Svg name="globe" />
          {locale === "pt-BR" ? "PT" : "EN"}
        </button>
      </Tip>
      {home && (
        <Tip label={t("nav.library")}>
          <a class="btn icon-only" href="#/" aria-label={t("nav.library")}>
            <Svg name="home" />
          </a>
        </Tip>
      )}
      <Tip label={t("nav.settings")}>
        <a class="btn icon-only" href="#/settings" aria-label={t("nav.settings")}>
          <Svg name="gear" />
        </a>
      </Tip>
    </>
  );
}
