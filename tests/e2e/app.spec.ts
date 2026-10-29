import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e-init")) {
      localStorage.clear();
      localStorage.setItem("aomr-bob:prefs:v1", JSON.stringify({ locale: "pt-BR" }));
      sessionStorage.setItem("e2e-init", "1");
    }
  });
});

async function createBuildWithActions(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByTestId("new-build").click();
  await expect(page).toHaveURL(/#\/build\/u-/);
  await page.getByTestId("build-name").fill("E2E Build");
  await page.getByTestId("kind-train").click();
  await page.getByTestId("pick-citizen").click();
  await page.getByTestId("kind-build").click();
  await page.getByTestId("pick-manor").click();
  await page.getByTestId("kind-move").click();
  await expect(page.getByTestId("action-row")).toHaveCount(3);
}

for (const locale of ["pt-BR", "en"] as const) {
  test(`creates and simulates a build (${locale})`, async ({ page }) => {
    await page.goto("/");
    if (locale === "en") await page.getByTestId("toggle-locale").click();
    await createBuildWithActions(page);
    const timeline = page.getByTestId("timeline");
    await expect(timeline.getByTestId("timeline-row").first()).toBeVisible();
    const word = locale === "pt-BR" ? "Treinar 1 Cidadão" : "Train 1 Citizen";
    await expect(timeline).toContainText(word);
    await expect(page.getByTestId("chart-resources")).toBeVisible();
    await expect(page.getByTestId("warnings")).toBeVisible();
  });
}

test("switches language without reloading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("new-build")).toContainText("Nova build");
  await page.getByTestId("toggle-locale").click();
  await expect(page.getByTestId("new-build")).toContainText("New build");
  await page.reload();
  await expect(page.getByTestId("new-build")).toContainText("New build");
});

test("exports and re-imports a build", async ({ page }) => {
  await createBuildWithActions(page);
  await page.goto("/");
  const download = page.waitForEvent("download");
  await page.getByTestId("export-one").first().click();
  const file = await (await download).path();
  const content = readFileSync(file, "utf8");
  expect(JSON.parse(content).builds[0].name).toBe("E2E Build");

  await page.getByTestId("delete").first().click();
  await page.getByRole("button", { name: "Sim" }).click();
  await expect(page.getByTestId("my-builds")).toHaveCount(0);

  await page.getByTestId("import-input").setInputFiles({
    name: "build.aomr-bob.json",
    mimeType: "application/json",
    buffer: Buffer.from(content),
  });
  await expect(page.getByTestId("my-builds").getByTestId("build-card")).toHaveCount(1);
  await expect(page.getByTestId("my-builds")).toContainText("E2E Build");
});

test("rejects an invalid import", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("import-input").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"aomr-bob","version":1,"builds":[{"nope":1}]}'),
  });
  await expect(page.locator(".toast.error")).toBeVisible();
  await expect(page.getByTestId("my-builds")).toHaveCount(0);
});

test("opens a preset read-only and duplicates it", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("presets").getByText("Krush").click();
  await expect(page.getByTestId("palette")).toHaveCount(0);
  await expect(page.getByTestId("timeline")).toContainText("Clássica");
  await page.getByTestId("duplicate-to-edit").click();
  await expect(page).toHaveURL(/#\/build\/u-/);
  await expect(page.getByTestId("palette")).toBeVisible();
  await page.goto("/");
  await expect(page.getByTestId("my-builds")).toContainText("Krush");
});

test("match mode clock runs, shifts and resets", async ({ page }) => {
  await page.goto("/#/play/preset%3Akrush");
  const clock = page.getByTestId("clock");
  await expect(clock).toHaveText("0:00");
  await page.getByTestId("match-plus").click();
  await expect(clock).toHaveText("0:05");
  await page.getByTestId("match-toggle").click();
  await expect(clock).toHaveText("0:06", { timeout: 3000 });
  await page.getByTestId("match-toggle").click();
  await expect(page.getByTestId("match-current")).toContainText("0:00");
  const next = (await page.getByTestId("match-next").locator(".step-time").textContent())!.trim();
  const [m, sec] = next.split(":").map(Number) as [number, number];
  for (let k = 0; k < Math.ceil((m * 60 + sec - 5) / 5); k++)
    await page.getByTestId("match-plus").click();
  await expect(page.getByTestId("match-current")).toContainText(next);
  await page.getByTestId("match-reset").click();
  await expect(clock).toHaveText("0:00");
});

test("has no horizontal scroll on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const path of ["/", "/#/build/preset%3Akrush", "/#/play/preset%3Akrush", "/#/settings"]) {
    await page.goto(path);
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("help tips explain titles and can be turned off", async ({ page }) => {
  await page.goto("/#/build/preset%3Akrush");
  const title = page
    .locator("h3 .tip.help")
    .filter({ hasText: /^Ações/ })
    .first();
  await title.hover();
  await expect(title.locator(".tip-bubble")).toBeVisible();
  await expect(title.locator(".tip-bubble")).toContainText("Arraste para reordenar");

  await page.goto("/#/settings");
  await page.getByTestId("tooltips-off").click();
  await page.goto("/#/build/preset%3Akrush");
  await expect(page.locator(".tip.help")).toHaveCount(0);
  await expect(page.locator("h3", { hasText: "Ações" })).toBeVisible();
});
