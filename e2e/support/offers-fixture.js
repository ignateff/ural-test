import { test as base, expect } from "@playwright/test";

const goods = [
  {
    goodsID: "original",
    brand: "ASAM",
    number: "01089",
    name: "Искомая деталь",
    warehouses: [
      { id: "main", code: "Основной склад", price: 100, stock: 3 },
      { id: "reserve", code: "Резервный склад", price: 200, stock: 1 },
    ],
    analogues: [
      {
        goodsID: "analogue",
        brand: "FEBI",
        number: "01089-1",
        name: "Аналог",
        warehouses: [{ id: "main", code: "Основной склад", price: 300, stock: 0 }],
      },
    ],
  },
];

export const test = base.extend({
  offersPage: async ({ page }, use) => {
    const errors = [];
    let requests = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://api.favorit-parts.ru/**", async (route) => {
      requests++;
      const brandsOnly = !new URL(route.request().url()).searchParams.has("brand");
      await route.fulfill({
        json: { goods: brandsOnly ? [{ brand: "ASAM", number: "01089" }] : goods },
      });
    });
    await page.goto("/?number=01089&brand=ASAM&sort=warehouse&order=desc");
    await expect(page.getByRole("table")).toBeVisible();
    // Дожидаемся отложенного поиска производителей по наблюдаемому состоянию.
    await expect(
      page.getByRole("combobox", { name: "Производитель искомой детали" }),
    ).toBeEnabled();
    const initialRequests = requests;
    await use(page);
    expect(requests, "Фильтрация должна оставаться локальной").toBe(initialRequests);
    expect(errors, "Ошибки браузера").toEqual([]);
  },
});

export { expect };
