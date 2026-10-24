import { test, expect } from "@playwright/test";

for (const width of [1200, 390]) {
  test.describe(`Конец виртуального подбора ${width}px`, () => {
    test.use({ viewport: { width, height: 820 } });
    test("достигает последней строки после фильтрации и смены ширины без пустого хвоста", async ({
      page,
    }) => {
      const goods = Array.from({ length: 240 }, (_, index) => ({
        goodsID: `part-${index}`,
        brand: "ASAM",
        number: `part-${index}`,
        name: `Деталь ${index}`,
        warehouses: [{ id: "main", code: "Основной", price: index, stock: index % 2 }],
      }));
      let requests = 0;
      await page.route("https://api.favorit-parts.ru/**", (route) => {
        requests++;
        const brand = new URL(route.request().url()).searchParams.get("brand");
        return route.fulfill({
          json: { goods: brand ? goods : [{ brand: "ASAM", number: "01089" }] },
        });
      });
      await page.goto("/?number=01089&brand=ASAM");
      const table = page.getByRole("table");
      await expect(table).toHaveAttribute("aria-rowcount", "241");
      await expect(
        page.getByRole("combobox", { name: "Производитель искомой детали" }),
      ).toBeEnabled();
      const initialRequests = requests;
      const reachEnd = async () => {
        // Repeated scrolling lets newly measured rows replace initial estimates.
        await expect
          .poll(
            async () => {
              await page.evaluate(() =>
                window.scrollTo({
                  top: document.documentElement.scrollHeight,
                  behavior: "instant",
                }),
              );
              await page.evaluate(
                () =>
                  new Promise((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(resolve)),
                  ),
              );
              const last = table
                .getByRole("row")
                .filter({ has: page.getByText("part-239", { exact: true }) });
              if (!(await last.count())) return false;
              const box = await last.boundingBox();
              const height = page.viewportSize().height;
              const tableBox = await table.boundingBox();
              return (
                box.y >= 0 &&
                box.y + box.height <= height + 1 &&
                tableBox.y + tableBox.height - box.y - box.height <= 2
              );
            },
            { message: "Последнее предложение видно у нижнего края без пустого хвоста" },
          )
          .toBe(true);
        await expect(table.getByText("part-239", { exact: true })).toBeInViewport({ ratio: 1 });
      };
      await reachEnd();
      await page.getByRole("button", { name: "Настроить фильтры", exact: true }).click();
      await page.getByRole("combobox", { name: "Наличие" }).selectOption("in");
      await page.getByRole("button", { name: "К предложениям (120)" }).click();
      await expect(table).toHaveAttribute("aria-rowcount", "121");
      await reachEnd();
      await page.setViewportSize({ width: width === 1200 ? 390 : 1200, height: 820 });
      await reachEnd();
      expect(requests, "Прокрутка, фильтрация и ресайз обходятся без HTTP").toBe(initialRequests);
    });
  });
}
