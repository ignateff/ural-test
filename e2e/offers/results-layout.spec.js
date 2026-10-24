import { test, expect } from "../support/offers-fixture.js";

for (const width of [1200, 768]) {
  test.describe(`Компактная шапка ${width}px`, () => {
    test.use({ viewport: { width, height: 820 } });
    test("кнопка рядом с заголовком, счётчик и сортировка рядом с искомой деталью", async ({
      offersPage: page,
    }) => {
      await page.getByRole("button", { name: /Настроить фильтры/ }).click();
      await page.getByRole("button", { name: "Производитель: Все производители" }).click();
      await page.getByRole("checkbox", { name: "ASAM", exact: true }).check();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "К предложениям (2)" }).click();
      const heading = await page
        .getByRole("heading", { name: "Детали и предложения" })
        .boundingBox();
      const filter = await page
        .getByRole("button", { name: "Настроить фильтры (1)" })
        .boundingBox();
      const selection = await page.locator(".selection").boundingBox();
      const count = await page.getByText("Показано 2 из 3", { exact: true }).boundingBox();
      const sort = await page.getByRole("combobox", { name: "Сортировка" }).boundingBox();
      expect(Math.abs(filter.y + filter.height / 2 - heading.y - heading.height / 2)).toBeLessThan(
        12,
      );
      expect(filter.x).toBeGreaterThan(heading.x + heading.width);
      expect(
        Math.abs(count.y + count.height / 2 - selection.y - selection.height / 2),
      ).toBeLessThan(8);
      expect(count.x).toBeGreaterThan(selection.x + selection.width);
      expect(Math.abs(sort.y + sort.height / 2 - selection.y - selection.height / 2)).toBeLessThan(
        12,
      );
      expect(sort.x).toBeGreaterThan(count.x + count.width);
      await expect(page.getByRole("button", { name: "Удалить производителя ASAM" })).toBeVisible();
    });
  });
}
