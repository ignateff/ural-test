import { test, expect } from "@playwright/test";

const goods = Array.from({ length: 180 }, (_, index) => ({
  goodsID: `part-${index}`,
  brand: "ASAM",
  number: `01089-${index}`,
  name: `Деталь ${index}`,
  warehouses: [{ id: "main", code: "Основной склад", price: 100 + index, stock: 3 }],
}));

async function openOffers(page) {
  await page.route("https://api.favorit-parts.ru/**", (route) =>
    route.fulfill({
      json: {
        goods: new URL(route.request().url()).searchParams.has("brand")
          ? goods
          : [{ brand: "ASAM", number: "01089" }],
      },
    }),
  );
  await page.goto("/?number=01089&brand=ASAM");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Производитель искомой детали" })).toBeEnabled();
}

for (const viewport of [
  { width: 390, height: 568 },
  { width: 768, height: 320 },
]) {
  test.describe(`Поиск на коротком окне ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });
    test("поиск уходит при прокрутке, предложения читаются без пустого отступа", async ({
      page,
    }, testInfo) => {
      await openOffers(page);
      await page.screenshot({ path: testInfo.outputPath("before-scroll.png") });
      await page.evaluate(() => window.scrollTo(0, 900));
      await expect
        .poll(async () => {
          const box = await page.getByRole("region", { name: "Подбор детали" }).boundingBox();
          return box.y + box.height;
        })
        .toBeLessThan(0);
      if (viewport.width >= 576) {
        await expect
          .poll(async () => (await page.getByRole("columnheader").first().boundingBox()).y)
          .toBeCloseTo(0, 0);
      }
      await expect(page.getByRole("table")).toContainText("Основной склад");
      await page.screenshot({ path: testInfo.outputPath("after-scroll.png") });
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.getByRole("textbox", { name: "Артикул детали" })).toBeInViewport();
      await page.getByRole("button", { name: /Настроить фильтры/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await page.mouse.move(viewport.width / 2, viewport.height - 30);
      await page.mouse.wheel(0, 300);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    });
  });
}

test("изменение высоты 600/601 px переключает закрепление без перезагрузки", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 768, height: 600 });
  await openOffers(page);
  const search = page.getByRole("region", { name: "Подбор детали" });
  const heading = page.getByRole("columnheader").first();
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect
    .poll(async () => (await search.boundingBox()).y + (await search.boundingBox()).height)
    .toBeLessThan(0);
  await expect.poll(async () => (await heading.boundingBox()).y).toBeCloseTo(0, 0);
  for (const height of [601, 980]) {
    await page.setViewportSize({ width: 768, height });
    await expect.poll(async () => (await search.boundingBox()).y).toBeCloseTo(0, 0);
    await expect
      .poll(async () => (await heading.boundingBox()).y - (await search.boundingBox()).height)
      .toBeCloseTo(0, 0);
    await page.screenshot({ path: testInfo.outputPath(`sticky-${height}.png`) });
  }
  await page.setViewportSize({ width: 768, height: 600 });
  await expect
    .poll(async () => (await search.boundingBox()).y + (await search.boundingBox()).height)
    .toBeLessThan(0);
  await expect.poll(async () => (await heading.boundingBox()).y).toBeCloseTo(0, 0);
  await page.screenshot({ path: testInfo.outputPath("not-sticky-600.png") });
  await page.evaluate(() => window.scrollTo(0, 0));
  const article = page.getByRole("textbox", { name: "Артикул детали" });
  await expect(article).toBeInViewport();
  await article.fill("01089 ");
  await expect(page.getByRole("combobox", { name: "Производитель искомой детали" })).toBeEnabled();
  await expect(page.getByRole("table")).toBeVisible();
});

test("короткое окно освобождает прокрутку после ошибки и повторной загрузки", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 320 });
  let respond;
  const pending = new Promise((resolve) => {
    respond = resolve;
  });
  let failed = false;
  await page.route("https://api.favorit-parts.ru/**", async (route) => {
    const brand = new URL(route.request().url()).searchParams.get("brand");
    if (brand === "FEBI" && !failed) {
      await pending;
      failed = true;
      return route.fulfill({ status: 500, json: { error: "Ошибка поставщика" } });
    }
    return route.fulfill({
      json: {
        goods: brand
          ? goods.map((part) => ({ ...part, brand }))
          : [
              { brand: "ASAM", number: "01089" },
              { brand: "FEBI", number: "01089" },
            ],
      },
    });
  });
  await page.goto("/?number=01089&brand=ASAM");
  const selector = page.getByRole("combobox", { name: "Производитель искомой детали" });
  await expect(selector).toBeEnabled();
  await expect(page.getByRole("table")).toBeVisible();
  await selector.selectOption("FEBI");
  await expect
    .poll(async () => {
      const opacity = await page
        .locator(".offers-content")
        .evaluate((element) => Number(getComputedStyle(element).opacity));
      return opacity > 0 && opacity < 1;
    })
    .toBe(true);
  const lockedY = await page.evaluate(() => window.scrollY);
  await page.mouse.move(400, 250);
  await page.mouse.wheel(0, 500);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await page.evaluate(() => window.scrollY)).toBe(lockedY);
  respond();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(lockedY);
  await page.getByRole("button", { name: "Повторить" }).click();
  await expect(page.locator(".offers-content")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("table")).toContainText("FEBI");
  await expect(page.getByRole("alert")).toHaveCount(0);
  const restoredY = await page.evaluate(() => window.scrollY);
  await page.mouse.move(400, 250);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(restoredY);
});
