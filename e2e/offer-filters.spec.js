import { test, expect } from "./offers-fixture.js";

const groups = [
  { name: "Склад", value: "Основной склад", parameter: "wh" },
  { name: "Производитель", value: "ASAM", parameter: "brands" },
];

for (const viewport of [
  { width: 1200, height: 820 },
  { width: 390, height: 820 },
  { width: 320, height: 568 },
]) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    for (const { name, value, parameter } of groups) {
      test(`${name}: вся строка, чекбокс и Space переключают выбор один раз`, async ({
        offersPage: page,
      }) => {
        const open = page.getByRole("button", { name: /Настроить фильтры/ });
        await open.click();
        const drawer = page.getByRole("dialog", { name: "Фильтры", exact: true });
        const trigger = drawer.getByRole("button", { name: new RegExp(`^${name}:`) });
        await trigger.click();
        const popup = drawer.getByRole("dialog", { name: `${name}: варианты` });
        const checkbox = popup.getByRole("checkbox", { name: value, exact: true });
        const text = popup.getByText(value, { exact: true });

        await text.click();
        await expect(checkbox).toBeChecked();
        await expect(popup).toBeVisible();
        await expect(drawer.getByRole("button", { name: "К предложениям (2)" })).toBeVisible();
        await expect
          .poll(() => new URL(page.url()).searchParams.getAll(parameter))
          .toEqual([value]);
        await text.click();
        await expect(checkbox).not.toBeChecked();

        // Координата у правой границы группы проверяет и свободное место строки.
        const list = await popup.getByRole("group", { name, exact: true }).boundingBox();
        const row = await text.boundingBox();
        await page.mouse.click(list.x + list.width - 2, row.y + row.height / 2);
        await expect(checkbox).toBeChecked();
        await page.mouse.click(list.x + list.width - 2, row.y + row.height / 2);
        await expect(checkbox).not.toBeChecked();
        await checkbox.click();
        await expect(checkbox).toBeChecked();
        await page.keyboard.press("Space");
        await expect(checkbox).not.toBeChecked();
        await expect.poll(() => new URL(page.url()).searchParams.getAll(parameter)).toEqual([]);
        await expect(popup).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(popup).toBeHidden();
        await expect(drawer).toBeVisible();
        await expect(trigger).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(drawer).toBeHidden();
        await expect(open).toBeFocused();
        await expect(page).toHaveURL(/sort=warehouse&order=desc/);
      });
    }
  });
}

for (const viewport of [
  { width: 768, height: 320 },
  { width: 768, height: 240 },
]) {
  test.describe(`Низкий экран ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });
    test("поиск, варианты и очистка доступны в пределах экрана", async ({ offersPage: page }) => {
      await page.getByRole("button", { name: /Настроить фильтры/ }).click();
      const drawer = page.getByRole("dialog", { name: "Фильтры", exact: true });
      for (const { name, value } of groups) {
        await drawer.getByRole("button", { name: new RegExp(`^${name}:`) }).click();
        const popup = drawer.getByRole("dialog", { name: `${name}: варианты` });
        const box = await popup.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        await expect(popup.getByRole("searchbox")).toBeInViewport({ ratio: 1 });
        await expect(popup.getByRole("checkbox", { name: value, exact: true })).toBeInViewport({
          ratio: 1,
        });
        await popup.getByText(value, { exact: true }).click();
        await expect(popup.getByRole("checkbox", { name: value, exact: true })).toBeChecked();
        const clear = popup.getByRole("button", { name: "Очистить выбор" });
        await expect(clear).toBeInViewport({ ratio: 1 });
        await clear.click();
        await expect(popup.getByRole("checkbox", { name: value, exact: true })).not.toBeChecked();
        await page.keyboard.press("Escape");
      }
    });
  });
}
