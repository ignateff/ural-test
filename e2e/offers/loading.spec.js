import { test, expect } from "@playwright/test";

const goods = (brand, prefix) =>
  Array.from({ length: 180 }, (_, index) => ({
    goodsID: `${brand}-${index}`,
    brand,
    number: `part-${index}`,
    name: `${prefix} ${index}`,
    warehouses: [{ id: "main", code: "Основной склад", price: index + 100, stock: index % 2 }],
  }));

for (const width of [1200, 390]) {
  test.describe(`Обновление таблицы ${width}px`, () => {
    test.use({
      viewport: { width, height: 820 },
      hasTouch: width === 390,
      isMobile: width === 390,
    });

    test("сохраняет виртуализированные строки, геометрию и позицию; блокирует прокрутку до ответа", async ({
      page,
    }, testInfo) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let finish;
      const response = new Promise((resolve) => {
        finish = resolve;
      });
      await page.route("https://api.favorit-parts.ru/**", async (route) => {
        const brand = new URL(route.request().url()).searchParams.get("brand");
        if (brand === "FEBI") await response;
        await route.fulfill({
          json: {
            goods: brand
              ? goods(brand, brand === "ASAM" ? "Предыдущая деталь" : "Новая деталь")
              : [
                  { brand: "ASAM", number: "01089" },
                  { brand: "FEBI", number: "01089" },
                ],
          },
        });
      });
      await page.goto("/?number=01089&brand=ASAM");
      const table = page.locator(".offers-table table");
      await expect(table).toBeVisible();
      const selector = page.getByRole("combobox", { name: "Производитель искомой детали" });
      await expect(selector).toBeEnabled();
      await page.evaluate(() => window.scrollTo(0, 600));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
      const tableNode = await table.elementHandle();
      const before = await table.boundingBox();
      const rowsBefore = await table.locator("tbody").innerText();
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      await selector.selectOption("FEBI");
      const content = page.locator(".offers-content");
      await expect
        .poll(async () => {
          const opacity = await content.evaluate((element) =>
            Number(getComputedStyle(element).opacity),
          );
          return opacity > 0 && opacity < 1;
        })
        .toBe(true);
      await expect(content).toHaveAttribute("inert", "");
      await expect(table).toBeVisible();
      expect(await tableNode.evaluate((el) => el.isConnected)).toBe(true);
      expect(await table.locator("tbody").innerText()).toBe(rowsBefore);
      expect(await table.boundingBox()).toEqual(before);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(pageHeight);
      await expect(page.locator(".offers-refresh-status .state")).toBeVisible();
      await page.mouse.move(width / 2, 700);
      await page.mouse.wheel(0, 500);
      await page.locator("main").focus();
      await page.keyboard.press("PageDown");
      if (width === 390) {
        const touch = await page.context().newCDPSession(page);
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: 180, y: 650 }],
        });
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 180, y: 250 }],
        });
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await touch.detach();
      }
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      expect(await page.evaluate(() => window.scrollY)).toBe(600);
      // inert исключает и программный фокус на сортировке старых результатов.
      await table
        .locator(".sort-heading")
        .first()
        .evaluate((button) => button.focus());
      expect(await content.evaluate((el) => el.contains(document.activeElement))).toBe(false);
      await page.screenshot({ path: testInfo.outputPath("loading.png") });
      finish();
      await expect(content).toHaveCSS("opacity", "1");
      await expect(content).not.toHaveAttribute("inert");
      expect(await tableNode.evaluate((el) => el.isConnected)).toBe(true);
      await expect(table).toContainText("Новая деталь");
      await expect(table).not.toContainText("Предыдущая деталь");
      await expect(page.locator(".offers-refresh-status")).toHaveCount(0);
      const restoredY = await page.evaluate(() => window.scrollY);
      await page.mouse.move(width / 2, 700);
      await page.mouse.wheel(0, 500);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(restoredY);
      expect(errors).toEqual([]);
    });
  });
}
