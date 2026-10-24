import { test, expect } from "@playwright/test";

const longBrand = "Automotive International Parts Manufacturing Company";
const unbrokenBrand = "X".repeat(180);
const brands = ["AP", longBrand, unbrokenBrand];

for (const viewport of [
  { width: 320, height: 568 },
  { width: 768, height: 320 },
]) {
  test.describe(`Стрелка производителя ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });
    test("оставляет место стрелке при длинном названии и сохраняет выбор", async ({ page }) => {
      await page.route("https://api.favorit-parts.ru/**", (route) => {
        const brand = new URL(route.request().url()).searchParams.get("brand");
        return route.fulfill({
          json: {
            goods: brand
              ? [
                  {
                    brand,
                    number: "01089",
                    name: "Тестовая деталь",
                    warehouses: [{ code: "Основной", price: 100, stock: 1 }],
                  },
                ]
              : brands.map((name) => ({ brand: name, number: "01089" })),
          },
        });
      });
      await page.goto("/");
      const select = page.getByRole("combobox", { name: "Производитель искомой детали" });
      const noOverflow = async () => {
        // Полоса прокрутки может занимать место внутри viewport (Linux CI).
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        ).toBe(true);
      };
      await expect(select).toBeDisabled();
      await expect(select).toHaveValue("");
      await noOverflow();
      await page.getByRole("textbox", { name: "Артикул детали" }).fill("01089");
      await expect(select).toBeEnabled();
      await expect(select).toHaveValue("");
      await noOverflow();
      const choose = async (brand) => {
        const request = page.waitForRequest(
          (request) => new URL(request.url()).searchParams.get("brand") === brand,
        );
        await select.selectOption(brand);
        await request;
        await expect(
          page.getByText(`Выбран производитель: ${brand}`, { exact: true }),
        ).toBeVisible();
        await expect(page.getByRole("table")).toContainText(brand);
        await noOverflow();
      };
      await choose(longBrand);
      const arrow = await select.evaluate((element) => {
        const style = getComputedStyle(element);
        // Background positioned from the right: reserved text padding must cover
        // the actual arrow width, its inset, and a visible gap.
        return {
          padding: parseFloat(style.paddingRight),
          inset: parseFloat(style.backgroundPositionX.match(/(?:right |100% - )([\d.]+)px/)?.[1]),
          width: parseFloat(style.backgroundSize),
          image: style.backgroundImage,
        };
      });
      expect(arrow.image).not.toBe("none");
      expect(arrow.width).toBeGreaterThan(0);
      expect(arrow.inset).toBeGreaterThanOrEqual(0);
      expect(
        arrow.padding - arrow.inset - arrow.width,
        "Между текстом и стрелкой есть зазор",
      ).toBeGreaterThan(0);
      await choose(unbrokenBrand);
      await choose("AP");
      await select.focus();
      const request = page.waitForRequest(
        (request) => new URL(request.url()).searchParams.get("brand") === unbrokenBrand,
      );
      await page.keyboard.press("x");
      await page.keyboard.press("Tab");
      await request;
      await expect(select).toHaveValue(unbrokenBrand);
      await expect(page.getByRole("table")).toContainText(unbrokenBrand);
      await expect(
        page.getByText(`Выбран производитель: ${unbrokenBrand}`, { exact: true }),
      ).toBeVisible();
      await noOverflow();
    });
  });
}
