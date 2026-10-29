import { HelpText } from "./icon.tsx";
import { useApp } from "./context.tsx";
import { Svg } from "./svg.tsx";

export function SettingsPage() {
  const { t, prefs, setPrefs, locale, data } = useApp();
  return (
    <div class="stack" style={{ maxWidth: "560px" }}>
      <h1 class="row">
        <Svg name="gear" />
        {t("nav.settings")}
      </h1>
      <div class="panel stack">
        <label class="field">
          <HelpText k="settings.language" />
          <select
            value={locale}
            data-testid="settings-locale"
            onChange={(e) => setPrefs({ locale: e.currentTarget.value as "pt-BR" | "en" })}
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
          </select>
        </label>
        <div class="field">
          <HelpText k="settings.theme" />
          <div class="row">
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                key={theme}
                class="chip"
                aria-pressed={prefs.theme === theme}
                onClick={() => setPrefs({ theme })}
              >
                <Svg name={theme === "light" ? "sun" : theme === "dark" ? "moon" : "monitor"} />
                {t(`settings.theme${theme[0]!.toUpperCase()}${theme.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>
        <label class="field">
          <HelpText k="settings.efficiency" />
          <input
            type="number"
            step="0.01"
            min="0.1"
            max="1.5"
            placeholder={String(data.common.defaults.efficiency)}
            value={prefs.efficiency ?? ""}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setPrefs({ efficiency: v ? Number(v) : undefined });
            }}
          />
        </label>
        <div class="field">
          <HelpText k="settings.tooltips" />
          <div class="row">
            <button
              class="chip"
              aria-pressed={prefs.tooltips}
              data-testid="tooltips-on"
              onClick={() => setPrefs({ tooltips: true })}
            >
              <Svg name="info" />
              {t("settings.on")}
            </button>
            <button
              class="chip"
              aria-pressed={!prefs.tooltips}
              data-testid="tooltips-off"
              onClick={() => setPrefs({ tooltips: false })}
            >
              <Svg name="stop" />
              {t("settings.off")}
            </button>
          </div>
        </div>
        <div class="field">
          <HelpText k="settings.sound" />
          <div class="row">
            <button
              class="chip"
              aria-pressed={prefs.sound}
              onClick={() => setPrefs({ sound: true })}
            >
              <Svg name="volume" />
              {t("settings.on")}
            </button>
            <button
              class="chip"
              aria-pressed={!prefs.sound}
              onClick={() => setPrefs({ sound: false })}
            >
              <Svg name="mute" />
              {t("settings.off")}
            </button>
          </div>
        </div>
      </div>
      <div class="panel stack">
        <h3>
          <HelpText k="settings.data" />
        </h3>
        <span>
          <HelpText k="settings.patch" />: <span class="num">{data.common.patch}</span>
        </span>
        <a href={`${import.meta.env.BASE_URL}api/v1/index.json`}>
          <HelpText k="settings.api" />
        </a>
      </div>
    </div>
  );
}
