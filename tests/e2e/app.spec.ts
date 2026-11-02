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
  await expect(page.getByTestId("god-kronos")).toBeVisible();
  await page.getByTestId("next-stage").click();
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
    const word = locale === "pt-BR" ? "Treinar 1 Cidadão" : "Train 1 Citizen";
    await expect(page.locator("ol.actions-list")).toContainText(word);
    await expect(page.getByTestId("action-row").first()).toContainText("0:00");
    const timeline = page.getByTestId("timeline");
    await expect(timeline.getByTestId("timeline-row").first()).toBeVisible();
    await page.getByTestId("warnings-toggle").click();
    await expect(page.getByTestId("warnings")).toBeVisible();
    await page.getByTestId("warnings-close").click();
    await expect(page.getByTestId("warnings")).toHaveCount(0);
    await page.getByTestId("tab-result").click();
    await expect(page.getByTestId("chart-resources")).toBeVisible();
    await expect(page.getByTestId("production-lane").first()).toBeVisible();
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
  await page.getByTestId("my-builds").getByTestId("build-menu").click();
  await page.getByTestId("export-one").click();
  const file = await (await download).path();
  const content = readFileSync(file, "utf8");
  expect(JSON.parse(content).builds[0].name).toBe("E2E Build");

  await page.getByTestId("my-builds").getByTestId("build-menu").click();
  await page.getByTestId("delete").click();
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

test("opens a preset in the overview and duplicates it to edit", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("presets").getByTestId("open-view").first()).toBeVisible();
  await expect(page.getByTestId("presets").getByTestId("open-edit")).toHaveCount(0);
  await page.getByTestId("presets").getByText("Krush").click();
  await expect(page).toHaveURL(/#\/view\/preset/);
  await expect(page.getByTestId("overview")).toBeVisible();
  await expect(page.getByTestId("palette")).toHaveCount(0);
  await expect(page.getByTestId("order-list")).toContainText("Clássica");
  const header = page.getByTestId("build-header");
  await expect(header.getByTestId("open-edit")).toHaveCount(0);
  await header.getByTestId("build-menu").click();
  await page.getByTestId("duplicate").click();
  await expect(page).toHaveURL(/#\/build\/u-/);
  await expect(page.getByTestId("palette")).toBeVisible();
  await page.goto("/");
  await expect(page.getByTestId("my-builds")).toContainText("Krush");
});

test("a share link opens the build for anyone, who can save a copy", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/view/preset%3Akrush");
  await page.getByTestId("build-header").getByTestId("build-menu").click();
  await page.getByTestId("share-link").click();
  await expect(page.locator(".toast")).toContainText("Link copiado");
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/#\/import\/[A-Za-z0-9_-]+$/);

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await expect(page.getByTestId("share-banner")).toBeVisible();
  await expect(page.getByTestId("build-title")).toHaveText("Krush");
  await expect(page.getByTestId("order-list")).toContainText("Clássica");
  await page.getByTestId("share-save").click();
  await expect(page).toHaveURL(/#\/view\/u-/);
  await page.goto("/");
  await expect(page.getByTestId("my-builds")).toContainText("Krush");

  await page.goto("/#/import/broken-link");
  await expect(page.getByTestId("share-error")).toBeVisible();
});

test("an own build can be proposed as standard on GitHub, a preset cannot", async ({
  page,
  context,
}) => {
  await context.route("https://github.com/**", (route) => route.fulfill({ body: "ok" }));
  await createBuildWithActions(page);
  await page.getByTestId("build-header").getByTestId("build-menu").click();
  await page.getByTestId("propose").click();
  const popup = page.waitForEvent("popup");
  await page.locator(".modal .btn").first().click();
  const url = new URL((await popup).url());
  expect(url.host).toBe("github.com");
  expect(url.pathname).toMatch(/\/issues\/new$/);
  expect(url.searchParams.get("template")).toBe("propose-build.yml");
  expect(url.searchParams.get("title")).toBe("[Build] E2E Build");
  expect(url.searchParams.get("link")).toMatch(/#\/import\/[A-Za-z0-9_-]+$/);

  await page.goto("/#/view/preset%3Akrush");
  await page.getByTestId("build-header").getByTestId("build-menu").click();
  await expect(page.getByTestId("share-link")).toBeVisible();
  await expect(page.getByTestId("propose")).toHaveCount(0);
});

test("a build has three screens: overview, editor and match mode", async ({ page }) => {
  await createBuildWithActions(page);
  await page.goto("/");
  await page.getByTestId("my-builds").getByText("E2E Build").click();
  await expect(page).toHaveURL(/#\/view\/u-/);
  const overview = page.getByTestId("overview");
  await expect(overview.getByTestId("build-title")).toHaveText("E2E Build");
  // simple by default: ages and the order of the actions
  await expect(overview.getByTestId("order-list").locator("li")).toHaveCount(3);
  await expect(overview.getByTestId("order-list")).toContainText("Treinar 1 Cidadão");
  await expect(overview.getByTestId("timeline")).toHaveCount(0);
  await overview.getByTestId("overview-full").check();
  await expect(overview.getByTestId("timeline")).toBeVisible();
  await expect(overview.getByTestId("chart-resources")).toBeVisible();
  await expect(overview.getByTestId("production-lane").first()).toBeVisible();
  const fields = overview.locator(".overview > :not(header) :is(input, select, textarea)");
  await expect(fields.filter({ visible: true })).toHaveCount(0);
  await expect(page.getByTestId("palette")).toHaveCount(0);
  await page.reload();
  await expect(overview.getByTestId("overview-full")).toBeChecked();
  await expect(overview.getByTestId("open-view")).toHaveAttribute("aria-current", "page");

  await overview.getByTestId("open-match").click();
  await expect(page).toHaveURL(/#\/play\/u-/);
  await expect(page.getByTestId("open-match")).toHaveAttribute("aria-current", "page");
  await page.getByTestId("open-edit").click();
  await expect(page).toHaveURL(/#\/build\/u-/);
  await expect(page.getByTestId("palette")).toBeVisible();
  await page.getByTestId("build-header").getByTestId("open-view").click();
  await expect(page).toHaveURL(/#\/view\/u-/);
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
  const next = (await page
    .getByTestId("match-next")
    .locator(".step-time")
    .first()
    .textContent())!.trim();
  const [m, sec] = next.split(":").map(Number) as [number, number];
  for (let k = 0; k < Math.ceil((m * 60 + sec - 5) / 5); k++)
    await page.getByTestId("match-plus").click();
  await expect(page.getByTestId("match-current")).toContainText(next);
  await page.getByTestId("match-reset").click();
  await expect(clock).toHaveText("0:00");
});

test("match mode shows the next 3 steps and where the villagers should be", async ({ page }) => {
  await page.goto("/#/play/preset%3Akrush");
  await expect(page.getByTestId("match-next").locator(".match-step")).toHaveCount(3);
  const eco = page.getByTestId("match-eco");
  await expect(eco).toBeVisible();
  await expect(page.getByTestId("match-pop")).toContainText("/");
  const food = page.getByTestId("match-eco-food").locator(".match-eco-count");
  const before = await food.textContent();
  for (let k = 0; k < 12; k++) await page.getByTestId("match-plus").click();
  await expect(page.getByTestId("clock")).toHaveText("1:00");
  await expect(food).not.toHaveText(before!);
  await expect(eco).toBeInViewport();
});

test("shows the starting units and sends idle ones to work", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-build").click();
  await page.getByTestId("next-stage").click();
  const start = page.getByTestId("start-row");
  await expect(start).toContainText("275");
  await expect(page.getByTestId("start-idle")).toContainText("2");
  await page.getByTestId("kind-move").click();
  await expect(page.getByTestId("action-row").first()).toContainText("2 Cidadãos de ocioso");
  await expect(page.getByTestId("start-idle")).toHaveCount(0);
});

test("a warning explains the wait with the numbers behind it", async ({ page, isMobile }) => {
  await page.goto("/#/build/preset%3Akrush");
  await page.getByTestId("warnings-toggle").click();
  // the Heroic age: the longest wait for food
  const item = page
    .getByTestId("warnings")
    .locator(".warn-item")
    .filter({ hasText: "Comida" })
    .last();
  if (isMobile) await item.click();
  else await item.hover();
  const card = page.locator(".wd-card:visible").filter({ hasText: "Custo" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("800");
  await expect(card).toContainText("562");
  await expect(card).toContainText("Coletando");
});

test("drag and drop: food chain, matchups and palette", async ({ page, isMobile }) => {
  test.skip(isMobile, "HTML drag and drop needs a mouse");
  await page.goto("/");
  await page.getByTestId("new-build").click();
  await page.getByTestId("tab-details").click();
  await page.locator("details.collapsible > summary").click();
  const chain = page.getByTestId("food-chain").locator("li");
  // dragging near the window edge makes the browser scroll mid-drag: keep the chain in the middle
  await page.getByTestId("food-pool").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(chain.first()).toHaveAttribute("data-testid", "chain-hunt");
  await page.getByTestId("chain-berries").dragTo(page.getByTestId("chain-hunt"));
  await expect(chain.first()).toHaveAttribute("data-testid", "chain-berries");
  await page.getByTestId("chain-farm").dragTo(page.getByTestId("food-pool"));
  await expect(chain).toHaveCount(2);

  await page.getByTestId("matchup-zeus").dragTo(page.getByTestId("matchup-col-good"));
  await expect(page.getByTestId("matchup-col-good").getByTestId("matchup-zeus")).toBeVisible();
  await page.getByTestId("matchup-zeus").dragTo(page.getByTestId("matchup-col-bad"));
  await expect(page.getByTestId("matchup-col-bad").getByTestId("matchup-zeus")).toBeVisible();
  await page.getByTestId("matchup-zeus").dragTo(page.getByTestId("matchup-pool"));
  await expect(page.getByTestId("matchup-pool").getByTestId("matchup-zeus")).toBeVisible();

  await page.getByTestId("tab-actions").click();
  await page.getByTestId("kind-build").click();
  await page.getByTestId("pick-manor").click();
  await page.getByTestId("kind-train").click();
  await page.getByTestId("pick-citizen").dragTo(page.getByTestId("action-row").first());
  const rows = page.getByTestId("action-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Cidadão");
  await page.getByTestId("kind-move").dragTo(page.getByTestId("action-row").nth(1));
  await expect(rows.nth(1)).toContainText("ocioso");
});

test("a picked minor god can be removed", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-build").click();
  await page.getByTestId("minor-prometheus").click();
  await page.getByTestId("minor-rheia").click();
  await expect(page.getByTestId("minor-prometheus")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("minor-rheia").click();
  await expect(page.getByTestId("minor-rheia")).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("minor-rheia").click();
  await page.getByTestId("minor-prometheus").click();
  await page.getByRole("button", { name: "Sim" }).click();
  await expect(page.getByTestId("minor-prometheus")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("minor-rheia")).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("tab-actions").click();
  await expect(page.getByTestId("action-row")).toHaveCount(0);
});

test("warnings drawer jumps to the action", async ({ page, isMobile }) => {
  await page.goto("/#/build/preset%3Akrush");
  await page.getByTestId("warnings-toggle").click();
  const item = page.getByTestId("warnings").locator(".warn-item").first();
  await expect(item).toContainText("3:38");
  await item.click();
  if (isMobile) await page.getByTestId("warning-go").click();
  await expect(page.getByTestId("warnings")).toHaveCount(0);
  await expect(page.locator(".action-row:focus")).toContainText("3:38");
});

test("has no horizontal scroll on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const paths = ["/", "/#/view/", "/#/build/", "/#/play/"].map((p) =>
    p === "/" ? p : `${p}preset%3Akrush`,
  );
  for (const path of [...paths, "/#/settings"]) {
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
    .locator(".tip.help")
    .filter({ hasText: /^Prédios/ })
    .first();
  await title.hover();
  await expect(title.locator(".tip-bubble")).toBeVisible();
  await expect(title.locator(".tip-bubble")).toContainText("Uma linha por prédio");

  await page.goto("/#/settings");
  await page.getByTestId("tooltips-off").click();
  await page.goto("/#/build/preset%3Akrush");
  await expect(page.locator(".tip.help")).toHaveCount(0);
  await expect(page.getByTestId("toggle-lanes")).toContainText("Prédios");
});

test("build screen header keeps the build actions", async ({ page }) => {
  await createBuildWithActions(page);
  const header = page.getByTestId("build-header");
  await expect(header.getByTestId("open-match")).toBeVisible();
  await expect(header.getByTestId("export-one")).toHaveCount(0);
  await header.getByTestId("build-menu").click();
  for (const id of ["duplicate", "export-one", "export-dashboard", "delete"]) {
    await expect(header.getByTestId(id)).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(header.getByTestId("export-one")).toHaveCount(0);
  await header.getByTestId("build-menu").click();
  const download = page.waitForEvent("download");
  await header.getByTestId("export-dashboard").click();
  expect((await download).suggestedFilename()).toContain(".dashboard.json");
  await header.getByTestId("build-menu").click();
  await header.getByTestId("delete").click();
  await page.getByRole("button", { name: "Sim" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByTestId("my-builds")).toHaveCount(0);
});

test("result stage shows what each building produces", async ({ page }) => {
  await page.goto("/#/build/preset%3Akrush");
  await page.getByTestId("tab-result").click();
  await expect(page.getByTestId("milestones")).toBeVisible();
  const lanes = page.getByTestId("production-lane");
  await expect(lanes.first()).toContainText("Centro Urbano");
  expect(await page.getByTestId("production-bar").count()).toBeGreaterThan(10);
  await expect(page.getByTestId("production-bar").first()).toHaveAttribute(
    "aria-label",
    /0:00 → 0:28/,
  );
  await page.getByTestId("tab-details").click();
  await expect(page.getByTestId("matchups")).toBeVisible();
});

test("Oracle Hero is promoted, not trained, until Sons of the Sun is researched", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-build").click();
  await page.getByTestId("next-stage").click();
  await page.getByTestId("kind-train").click();
  await expect(page.getByTestId("pick-oracle")).toBeVisible();
  await expect(page.getByTestId("pick-oracle-hero")).toHaveCount(0);
  await expect(page.getByTestId("pick-citizen-hero")).toHaveCount(0);
  await page.getByTestId("kind-age").click();
  await page.getByTestId("pick-prometheus").click();
  await page.getByTestId("pick-hyperion").click();
  await page.getByTestId("kind-research").click();
  await page.getByTestId("pick-sons-of-the-sun").click();
  await page.getByTestId("kind-train").click();
  await expect(page.getByTestId("pick-oracle-hero")).toBeVisible();
});

test("palette only offers actions the chosen god can use", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-build").click();
  const pick = async (id: string) => {
    await page.getByTestId("tab-gods").click();
    await page.getByTestId(id).click();
    await page.getByTestId("tab-actions").click();
  };
  await pick("god-kronos");
  await expect(page.getByTestId("kind-timeShift")).toBeVisible();
  await expect(page.getByTestId("kind-promote")).toBeVisible();
  await pick("god-gaia");
  await expect(page.getByTestId("kind-timeShift")).toHaveCount(0);
  await expect(page.getByTestId("kind-promote")).toBeVisible();
  await pick("pantheon-greeks");
  await expect(page.getByTestId("kind-promote")).toHaveCount(0);
  await expect(page.getByTestId("kind-timeShift")).toHaveCount(0);
  await pick("pantheon-norse");
  await page.getByTestId("kind-promote").click();
  await expect(page.getByTestId("pick-gatherer")).toBeVisible();
});

test("Egyptian palette offers Empower, and summons only for Set", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("new-build").click();
  await page.getByTestId("pantheon-egyptians").click();
  await page.getByTestId("god-ra").click();
  await page.getByTestId("next-stage").click();
  await expect(page.getByTestId("kind-empower")).toBeVisible();
  await expect(page.getByTestId("kind-summon")).toHaveCount(0);
  await expect(page.getByTestId("kind-promote")).toHaveCount(0);
  await page.getByTestId("tab-gods").click();
  await page.getByTestId("god-set").click();
  await page.getByTestId("tab-actions").click();
  await expect(page.getByTestId("kind-summon")).toBeVisible();
  await page.getByTestId("kind-empower").click();
  await page.getByTestId("pick-town-center").click();
  await expect(page.getByTestId("action-row")).toHaveCount(1);
  await expect(page.getByTestId("action-row").first()).toContainText("Fortalecer");
});

test("undo and redo changes in the build", async ({ page }) => {
  await createBuildWithActions(page);
  const rows = page.getByTestId("action-row");
  await expect(rows).toHaveCount(3);
  await page.getByTestId("undo").click();
  await expect(rows).toHaveCount(2);
  await page.getByTestId("undo").click();
  await expect(rows).toHaveCount(1);
  await page.getByTestId("redo").click();
  await expect(rows).toHaveCount(2);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+z");
  await expect(rows).toHaveCount(1);
  await page.keyboard.press("Control+y");
  await expect(rows).toHaveCount(2);
  await rows.first().locator(".label-text").click();
  await page.getByTestId("row-remove").first().click();
  await expect(rows).toHaveCount(1);
  await page.getByTestId("undo").click();
  await expect(rows).toHaveCount(2);
});

test("builder choices only list earlier, matching actions", async ({ page }) => {
  await page.goto("/#/build/preset%3Akrush");
  const temple = page.getByTestId("action-row").nth(2);
  await expect(temple).toContainText("Templo");
  await temple.getByTestId("row-edit").click();
  const options = temple.getByTestId("builder-source").locator("option");
  await expect(options).toHaveCount(1);
  await expect(options.first()).toContainText("2. Treinar 3 Cidadãos");
});

test("clicking an action opens its details; its buttons do not", async ({ page }) => {
  await createBuildWithActions(page);
  const row = page.getByTestId("action-row").first();
  const head = row.getByTestId("row-edit");
  await expect(head).toHaveAttribute("aria-expanded", "false");
  await row.locator(".label-text").click();
  await expect(head).toHaveAttribute("aria-expanded", "true");
  await expect(row.locator(".action-details")).toBeVisible();
  await row.getByTestId("row-count").fill("2");
  await expect(head).toHaveAttribute("aria-expanded", "true");
  await row.locator(".label-text").click();
  await expect(head).toHaveAttribute("aria-expanded", "false");
  await head.focus();
  await page.keyboard.press("Enter");
  await expect(head).toHaveAttribute("aria-expanded", "true");
});

test("screen choices are remembered after leaving the page", async ({ page }) => {
  await createBuildWithActions(page);
  const url = page.url();
  await expect(page.getByTestId("zoom-fit")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("zoom-2").click();
  await page.getByTestId("tab-result").click();
  await page.goto("/");
  await page.getByTestId("filter-greeks").click();
  await page.reload();
  await expect(page.getByTestId("filter-greeks")).toHaveAttribute("aria-pressed", "true");
  await page.goto(url);
  await expect(page.getByTestId("chart-resources")).toBeVisible();
  await page.getByTestId("tab-actions").click();
  await expect(page.getByTestId("zoom-2")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("timeline")).toBeVisible();
});

test("a new fixed time moves the action to its place in the list", async ({ page }) => {
  await createBuildWithActions(page);
  const rows = page.getByTestId("action-row");
  const first = rows.first();
  await expect(first).toContainText("Treinar 1 Cidadão");
  await first.locator(".label-text").click();
  await first.getByTestId("when-mode").selectOption("time");
  await first.getByTestId("when-time").fill("1:00");
  await first.getByTestId("when-time").press("Tab");
  await expect(rows.first()).not.toContainText("Treinar 1 Cidadão");
  await expect(rows.last()).toContainText("Treinar 1 Cidadão");
});

test("train has a mode: fixed count or an auto queue for some time", async ({ page }) => {
  await createBuildWithActions(page);
  await expect(page.getByTestId("kind-stopTrain")).toHaveCount(0);
  const row = page.getByTestId("action-row").first();
  await row.locator(".label-text").click();
  await expect(row.getByTestId("row-count")).toBeVisible();
  await expect(row.getByTestId("row-train-mode").locator("option")).toHaveCount(2);
  await expect(row.getByTestId("row-duration")).toHaveCount(0);
  await row.getByTestId("row-train-mode").selectOption("auto");
  await expect(row.getByTestId("row-count")).toHaveCount(0);
  await expect(row).toContainText("Produção automática de Cidadãos");
  await expect(row).toHaveClass(/kind-rule/);
  await row.getByTestId("row-duration").fill("30");
  await row.getByTestId("row-duration").press("Tab");
  await expect(row).toContainText("Produção automática de Cidadãos por 30 s");
  await row.getByTestId("row-duration").fill("90");
  await row.getByTestId("row-duration").press("Tab");
  await expect(row).toContainText("Produção automática de Cidadãos por 1:30");
  // the queue's end shows as an event
  await expect(page.locator("ol.actions-list")).toContainText("Fim da produção automática");
  // the mode explanation is a bulleted list
  const help = row.locator(".action-details .tip.help").filter({ hasText: "Modo" });
  await help.hover();
  await expect(help.locator(".tip-bubble li")).toHaveCount(2);
  await expect(help.locator(".tip-bubble li strong").first()).toHaveText("Quantidade fixa");
  await row.getByTestId("row-train-mode").selectOption("count");
  await expect(row).toContainText("Treinar 1 Cidadão");
});

test("the editor turns an old auto queue end time into a duration", async ({ page }) => {
  // stored before the app starts, so its first save does not overwrite it
  await page.addInitScript(() => {
    if (localStorage.getItem("aomr-bob:builds:v1")) return;
    const now = new Date().toISOString();
    const build = {
      format: "aomr-bob",
      version: 4,
      id: "u-old",
      name: "Old queue",
      createdAt: now,
      updatedAt: now,
      pantheon: "atlanteans",
      god: "kronos",
      type: "eco",
      actions: [
        { id: "a", when: "0:10", do: "move", count: 2, from: "idle", to: "food" },
        {
          id: "b",
          when: { after: "a" },
          do: "train",
          mode: "auto",
          unit: "citizen",
          until: "1:10",
        },
      ],
    };
    localStorage.setItem("aomr-bob:builds:v1", JSON.stringify([build]));
  });
  await page.goto("/#/build/u-old");
  await page.getByTestId("tab-actions").click();
  await expect(page.getByTestId("action-row").last()).toContainText("por 1:00");
});

test("'after' lists when other actions end (✓) and when they start", async ({ page }) => {
  await createBuildWithActions(page);
  const row = page.getByTestId("action-row").last();
  await row.locator(".label-text").click();
  await row.getByTestId("when-mode").selectOption("after");
  const after = row.getByTestId("when-after");
  await expect(after.locator("optgroup")).toHaveCount(2);
  await expect(after.locator("optgroup").first().locator("option").nth(1)).toContainText("✓");
  const start = after.locator("optgroup").last().locator("option").first();
  await after.selectOption((await start.getAttribute("value"))!);
  await expect(after).toHaveValue(/@start$/);
  await row.locator("input[type=number]").first().fill("5");
  await row.locator("input[type=number]").first().press("Tab");
  await expect(after).toHaveValue(/@start$/);
});

test("a clicked palette action scrolls into view and flashes", async ({ page, isMobile }) => {
  test.skip(isMobile, "building is desktop-only");
  await page.setViewportSize({ width: 1400, height: 600 });
  await createBuildWithActions(page);
  for (let k = 0; k < 14; k++) await page.getByTestId("kind-move").click();
  const rows = page.getByTestId("action-row");
  await expect(rows).toHaveCount(17);
  await page.locator(".tl").evaluate((el) => el.scrollTo({ top: 0 }));
  await expect(rows.last()).not.toBeInViewport();
  await page.getByTestId("kind-move").click();
  await expect(rows).toHaveCount(18);
  await expect(rows.last()).toHaveClass(/flash/);
  await expect(rows.last()).toBeInViewport();
});

test("actions only show the fields that apply to them", async ({ page }) => {
  await page.goto("/#/build/preset%3Akrush");
  const rows = page.getByTestId("action-row");
  const promethean = rows.filter({ hasText: "Prometeanos" }).first();
  await promethean.locator(".label-text").click();
  await expect(promethean.locator(".action-details")).toBeVisible();
  await expect(promethean.getByTestId("row-rally")).toHaveCount(0);
  await expect(promethean.locator(".action-details")).not.toContainText("Prédio");
  const citizens = rows.filter({ hasText: "Treinar 3 Cidadãos" }).first();
  await citizens.locator(".label-text").click();
  await expect(citizens.getByTestId("row-rally")).toBeVisible();
});

test("actions share one timeline with villagers, buildings and draggable bars", async ({
  page,
  isMobile,
}) => {
  await createBuildWithActions(page);
  await expect(page.getByTestId("workers-strip")).toBeVisible();
  await page.getByTestId("toggle-lanes").click();
  await expect(page.getByTestId("production-lane").first()).toBeVisible();
  test.skip(isMobile, "pointer drag is tested on desktop");
  const row = page.getByTestId("action-row").first();
  await expect(row).toContainText("Treinar 1 Cidadão");
  const bar = row.locator(".tl-bar").first();
  const box = (await bar.boundingBox())!;
  await page.mouse.move(box.x + 4, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + box.height / 2, { steps: 5 });
  await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const moved = page.getByTestId("action-row").filter({ hasText: "Treinar 1 Cidadão" });
  await expect(moved.locator(".row-time")).not.toContainText("0:00");
  await expect(moved.locator(".row-time")).toContainText("No tempo");
});

test("on desktop only the timeline scrolls, not the page", async ({ page, isMobile }) => {
  test.skip(isMobile, "building is done on desktop");
  await page.setViewportSize({ width: 1900, height: 900 });
  await page.goto("/#/build/preset%3Akrush");
  await page.getByTestId("tab-actions").click();
  await page.getByTestId("toggle-lanes").click();
  await expect(page.getByTestId("production-lane").first()).toBeVisible();
  const sizes = await page.evaluate(() => {
    const tl = document.querySelector<HTMLElement>(".tl")!;
    return {
      page: document.documentElement.scrollHeight - window.innerHeight,
      inner: tl.scrollHeight - tl.clientHeight,
      width: tl.getBoundingClientRect().width / window.innerWidth,
      trackStarts: new Set(
        [...tl.querySelectorAll(".tl-row > .tl-track")].map((e) => e.getBoundingClientRect().x),
      ).size,
    };
  });
  expect(sizes.page).toBeLessThanOrEqual(1);
  expect(sizes.inner).toBeGreaterThan(0);
  expect(sizes.width).toBeGreaterThan(0.95);
  expect(sizes.trackStarts).toBe(1);
});

test("at the same second an event comes before the actions", async ({ page }) => {
  await page.goto("/#/build/preset%3Akrush");
  await page.getByTestId("tab-actions").click();
  const rows = await page.locator("ol.actions-list > .tl-row").allTextContents();
  const age = rows.findIndex((r) => r.includes("2:55") && r.includes("Clássica ✓"));
  const firstAction = rows.findIndex((r) => r.includes("2:55") && r.includes("Treinar 1 Cidadão"));
  expect(age).toBeGreaterThanOrEqual(0);
  expect(firstAction).toBeGreaterThan(age);
});

test("hovering an event row highlights it like an action row", async ({ page, isMobile }) => {
  test.skip(isMobile, "needs a mouse");
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto("/#/build/preset%3Akrush");
  await page.getByTestId("tab-actions").click();
  const bg = (row: import("@playwright/test").Locator) =>
    row.locator(".tl-track").evaluate((el) => getComputedStyle(el).backgroundColor);
  const action = page.getByTestId("action-row").nth(2);
  const event = page.locator(".event-row").first();
  const restAction = await bg(action);
  const restEvent = await bg(event);
  await action.locator(".tl-track").hover();
  const hoverAction = await bg(action);
  expect(hoverAction).not.toBe(restAction);
  await event.locator(".tl-track").hover();
  expect(await bg(event)).not.toBe(restEvent);
  expect(await bg(event)).toBe(hoverAction);
});

test("hovering the timeline draws a time line through every row", async ({ page, isMobile }) => {
  test.skip(isMobile, "needs a mouse");
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto("/#/build/preset%3Akrush");
  await page.getByTestId("tab-actions").click();
  const axis = page.locator(".tl-axis-row .tl-track");
  const box = (await axis.boundingBox())!;
  const row = page.getByTestId("action-row").nth(3).locator(".tl-track");
  const rowBox = (await row.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, rowBox.y + rowBox.height / 2);
  await expect(page.locator(".tl-cursor-time")).toBeVisible();
  await expect(page.locator(".tl-cursor-time")).toHaveText(/^\d+:\d\d$/);
  const line = await row.evaluate((el) => {
    const s = getComputedStyle(el, "::after");
    return { display: s.display, x: el.getBoundingClientRect().x + parseFloat(s.left) };
  });
  expect(line.display).toBe("block");
  expect(Math.abs(line.x - (box.x + box.width / 2))).toBeLessThan(2);
  await page.screenshot({ path: "test-results/timeline-cursor.png" });
  for (const x of [box.x + 1, box.x + box.width - 1]) {
    await page.mouse.move(x, rowBox.y + rowBox.height / 2);
    const fits = await page.evaluate(() => {
      const tl = document.querySelector<HTMLElement>(".tl")!;
      const track = document.querySelector(".tl-axis-row .tl-track")!.getBoundingClientRect();
      const label = document.querySelector(".tl-cursor-time")!.getBoundingClientRect();
      return {
        scroll: tl.scrollWidth - tl.clientWidth,
        inside: label.left >= track.left - 0.5 && label.right <= track.right + 0.5,
      };
    });
    expect(fits).toEqual({ scroll: 0, inside: true });
  }
  await page.mouse.move(5, 5);
  await expect(page.locator(".tl-cursor-time")).toBeHidden();
});

test("timeline tooltips: villager card and a clock tip that is not covered", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "needs a mouse");
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto("/#/build/preset%3Akrush");
  await page.getByTestId("tab-actions").click();
  const strip = (await page.locator(".tl-economy").boundingBox())!;
  await page.mouse.move(strip.x + strip.width * 0.6, strip.y + strip.height / 2);
  const card = page.getByTestId("economy-card");
  await expect(card).toBeVisible();
  await expect(card.locator(".eco-row").first()).toBeVisible();
  await expect(card.locator(".eco-time")).toHaveText(/^\d+:\d\d$/);
  const cardBox = (await card.boundingBox())!;
  expect(cardBox.y).toBeGreaterThanOrEqual(0);
  expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(800);
  await page.screenshot({ path: "test-results/economy-card.png" });

  await page.locator(".tl-corner .tip").hover();
  const bubble = page.locator(".tl-corner .tip-bubble");
  await expect(bubble).toBeVisible();
  const covered = await bubble.evaluate((el) => {
    el.style.pointerEvents = "auto";
    const r = el.getBoundingClientRect();
    return [0.1, 0.5, 0.9].some((fx) =>
      [0.2, 0.5, 0.8].some((fy) => {
        const hit = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
        return !el.contains(hit);
      }),
    );
  });
  expect(covered).toBe(false);
});

test("tooltips inside an open action are drawn over the timeline rows", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "needs a mouse");
  await page.setViewportSize({ width: 1400, height: 800 });
  await createBuildWithActions(page);
  const row = page.getByTestId("action-row").first();
  await row.locator(".label-text").click();
  const help = row.locator(".action-details .tip.help").filter({ hasText: "Modo" });
  await help.hover();
  const bubble = help.locator(".tip-bubble");
  await expect(bubble).toBeVisible();
  const covered = await bubble.evaluate((el) => {
    el.style.pointerEvents = "auto";
    const r = el.getBoundingClientRect();
    return [0.1, 0.5, 0.9].some((fx) =>
      [0.1, 0.5, 0.9].some((fy) => {
        const hit = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
        return !el.contains(hit);
      }),
    );
  });
  expect(covered).toBe(false);
});

test("on desktop the build header sticks to the top of the window", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop layout");
  await page.setViewportSize({ width: 1400, height: 700 });
  await page.goto("/#/build/preset%3Akrush");
  await page.getByTestId("tab-result").click();
  await expect(page.getByTestId("result")).toBeVisible();
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  const top = await page
    .getByTestId("build-header")
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeLessThanOrEqual(1);
});
