import { test, expect } from "@playwright/test";

const brands = [
  "ADVICS",
  "Double Force",
  "FIT",
  "G-brake",
  "JFBK",
  "KASHIYAMA",
  "MASUMA",
  "NiBK",
  "SB NAGAMOCHI",
  "ZEVS",
];
async function open(page, selected = brands, extra = {}) {
  let requests = 0;
  await page.route("https://api.favorit-parts.ru/**", (route) => {
    requests++;
    const brandsOnly = !new URL(route.request().url()).searchParams.has("brand");
    return route.fulfill({
      json: {
        goods: brandsOnly
          ? [{ brand: "AP", number: "01089" }]
          : [
              {
                brand: "AP",
                number: "01089",
                goodsID: "original",
                warehouses: [{ code: "Основной склад", price: 500, stock: 3 }],
                analogues: selected.map((brand, index) => ({
                  brand,
                  number: `A-${index}`,
                  goodsID: `a-${index}`,
                  warehouses: [{ code: "Основной склад", price: 500, stock: 3 }],
                })),
              },
            ],
      },
    });
  });
  const query = new URLSearchParams({
    number: "01089",
    brand: "AP",
    sort: "warehouse",
    order: "desc",
    ...extra,
  });
  selected.forEach((brand) => query.append("brands", brand));
  await page.goto(`/?${query}`);
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Производитель искомой детали" })).toBeEnabled();
  return () => requests;
}

for (const width of [390, 576, 1200]) {
  test(`выбранные производители компактны и раскрываются при ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const requests = await open(page);
    const initialRequests = requests();
    const tags = page.getByRole("list", { name: "Выбранные фильтры" });
    const visible = tags.getByRole("button");
    const visibleCount = await visible.count();
    const rows = await visible.evaluateAll((buttons) => [
      ...new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top))),
    ]);
    expect(rows.length).toBeLessThanOrEqual(2);
    if (visibleCount < 10) {
      const toggle = page.getByRole("button", { name: `Ещё ${10 - visibleCount}`, exact: true });
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.focus();
      await page.keyboard.press("Enter");
      await expect(tags.getByRole("button")).toHaveCount(10);
      await expect(page.getByRole("button", { name: "Свернуть", exact: true })).toBeFocused();
      if (process.env.CAPTURE_UI)
        await page.screenshot({
          path: `.scratch/ui-visual-audit/screenshots/03-tags-${width}-expanded.png`,
          fullPage: true,
        });
      await page.keyboard.press("Enter");
      await expect(tags.getByRole("button")).toHaveCount(visibleCount);
    } else {
      await expect(page.getByRole("button", { name: /^Ещё / })).toHaveCount(0);
    }
    await expect(tags.getByRole("button").first()).toHaveText("ADVICS×");
    await expect(tags.getByText("Производители", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(requests()).toBe(initialRequests);
    if (process.env.CAPTURE_UI)
      await page.screenshot({
        path: `.scratch/ui-visual-audit/screenshots/03-tags-${width}-collapsed.png`,
        fullPage: true,
      });
  });
}

for (const width of [390, 576, 1200]) {
  test(`разные группы, длинные значения и действия с клавиатуры при ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const longBrand = "Производитель с очень длинным полным названием ".repeat(6).trim();
    const selected = [longBrand, ...brands];
    const requests = await open(page, selected, {
      stock: "in",
      wh: "Основной склад",
      kind: "analogue",
      priceFrom: "100",
      priceTo: "1000",
    });
    const initialRequests = requests();
    const tags = page.getByRole("list", { name: "Выбранные фильтры" });
    const total = 15;
    const count = await tags.getByRole("button").count();
    expect(count).toBeLessThan(total);
    const more = page.getByRole("button", { name: `Ещё ${total - count}`, exact: true });
    await more.focus();
    await page.keyboard.press("Enter");
    await expect(tags.getByRole("button")).toHaveCount(total);
    await expect(tags.getByText("Склады", { exact: true })).toBeVisible();
    await expect(tags.getByText("Производители", { exact: true })).toBeVisible();
    const longTag = tags.getByRole("button", {
      name: `Удалить производителя ${longBrand}`,
      exact: true,
    });
    await expect(longTag.getByText(longBrand, { exact: true })).toBeVisible();
    const longTextFits = await longTag.evaluate(
      (button) => button.scrollWidth <= button.clientWidth,
    );
    expect(longTextFits).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (process.env.CAPTURE_UI)
      await page.screenshot({
        path: `.scratch/ui-visual-audit/screenshots/03-tags-${width}-mixed-expanded.png`,
        fullPage: true,
      });
    await longTag.focus();
    await page.keyboard.press("Enter");
    await expect(tags.getByRole("button")).toHaveCount(14);
    await expect(tags.getByRole("button", { name: "Удалить производителя ADVICS" })).toBeFocused();
    const query = new URL(page.url()).searchParams;
    expect(query.getAll("brands")).toEqual(brands);
    expect(query.get("sort")).toBe("warehouse");
    expect(query.get("order")).toBe("desc");
    // Recount after deletion, then resize in the collapsed state.
    const collapse = page.getByRole("button", { name: "Свернуть", exact: true });
    if (await collapse.count()) await collapse.click();
    for (const nextWidth of [390, 576, 1200, width]) {
      await page.setViewportSize({ width: nextWidth, height: 844 });
      await expect
        .poll(async () => {
          const visible = await tags.getByRole("button").count();
          const toggles = await page.getByRole("button", { name: /^Ещё / }).allTextContents();
          return visible === 14 ? toggles.length === 0 : toggles.includes(`Ещё ${14 - visible}`);
        })
        .toBe(true);
    }
    if (process.env.CAPTURE_UI)
      await page.screenshot({
        path: `.scratch/ui-visual-audit/screenshots/03-tags-${width}-mixed-collapsed.png`,
        fullPage: true,
      });
    const reset = page.getByRole("button", { name: "Сбросить фильтры", exact: true });
    await reset.focus();
    await page.keyboard.press("Enter");
    await expect(tags).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Настроить фильтры", exact: true }),
    ).toBeFocused();
    expect(new URL(page.url()).searchParams.get("sort")).toBe("warehouse");
    expect(new URL(page.url()).searchParams.getAll("brands")).toEqual([]);
    expect(requests()).toBe(initialRequests);
  });
}

test("единственный тег удаляется с клавиатуры и возвращает фокус к настройке", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, ["ADVICS"]);
  await expect(page.getByRole("button", { name: /^Ещё / })).toHaveCount(0);
  await page.getByRole("button", { name: "Удалить производителя ADVICS", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("list", { name: "Выбранные фильтры" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Настроить фильтры", exact: true })).toBeFocused();
});

test("при расширении окна фокус не теряется вместе с ненужной кнопкой раскрытия", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.getByRole("button", { name: /^Ещё / }).focus();
  await page.setViewportSize({ width: 1200, height: 844 });
  await expect(page.getByRole("button", { name: /^Ещё / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Сбросить фильтры", exact: true })).toBeFocused();
});

test("единственное длинное название читается полностью без ложного счётчика скрытых значений", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const longBrand = "Производитель с очень длинным полным названием ".repeat(6).trim();
  await open(page, [longBrand]);
  await expect(page.getByRole("button", { name: /^Ещё / })).toHaveCount(0);
  await page.getByRole("button", { name: "Показать полностью", exact: true }).click();
  const tag = page.getByRole("button", { name: `Удалить производителя ${longBrand}`, exact: true });
  const value = tag.getByText(longBrand, { exact: true });
  expect(
    await value.evaluate(
      (text) => text.scrollHeight <= text.clientHeight && text.scrollWidth <= text.clientWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("button", { name: "Свернуть", exact: true })).toBeVisible();
});

test("при сужении окна фокус остаётся на видимом действии выбранных фильтров", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 844 });
  await open(page);
  const tags = page.getByRole("list", { name: "Выбранные фильтры" });
  await tags.getByRole("button", { name: "Удалить производителя ZEVS", exact: true }).focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: /^Ещё / })).toBeVisible();
  await expect(tags.getByRole("button").last()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tags.getByRole("button").last()).toBeFocused();
});
