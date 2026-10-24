import { test, expect } from "@playwright/test";

for (const width of [1200, 390]) {
  test.describe(`Цельное поле артикула ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });
    test("сохраняет общий контур при работе с очисткой", async ({ page }) => {
      await page.route("https://api.favorit-parts.ru/**", (route) =>
        route.fulfill({ json: { goods: [{ brand: "ASAM", number: "01089" }] } }),
      );
      await page.goto("/?number=01089");
      const input = page.getByRole("textbox", { name: "Артикул детали" });
      const field = input.locator("..");
      const clear = page.getByRole("button", { name: "Очистить артикул" });
      await expect(
        page.getByRole("combobox", { name: "Производитель искомой детали" }),
      ).toBeEnabled();
      const appearance = await field.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          border: style.borderWidth,
          children: [...element.children].map((child) => ({
            border: getComputedStyle(child).borderWidth,
            background: getComputedStyle(child).backgroundColor,
          })),
          background: style.backgroundColor,
        };
      });
      expect(appearance.border, "Общий непрерывный контур").toBe("1px");
      for (const child of appearance.children) {
        expect(child.border, "Внутри нет отдельных рамок").toBe("0px");
        expect(["rgba(0, 0, 0, 0)", appearance.background]).toContain(child.background);
      }
      const visibleBorder = async () => {
        await expect
          .poll(
            () =>
              field.evaluate((element) => {
                const style = getComputedStyle(element);
                return ["Top", "Right", "Bottom", "Left"].every((side) => {
                  const color = style[`border${side}Color`];
                  return (
                    parseFloat(style[`border${side}Width`]) > 0 &&
                    !["none", "hidden"].includes(style[`border${side}Style`]) &&
                    color !== "transparent" &&
                    !/rgba\(.*[,/]\s*0\s*\)$/.test(color)
                  );
                });
              }),
            "Каждая сторона рамки остаётся видимой",
          )
          .toBe(true);
      };
      await visibleBorder();
      const bounds = await field.boundingBox();
      await clear.hover();
      expect(await field.boundingBox()).toEqual(bounds);
      await visibleBorder();
      await input.focus();
      await expect(field).not.toHaveCSS("box-shadow", "none");
      await page.keyboard.press("Tab");
      await expect(clear).toBeFocused();
      await expect(clear).toHaveCSS("outline-style", "solid");
      await visibleBorder();
      expect(await field.boundingBox()).toEqual(bounds);
      await clear.hover();
      await page.mouse.down();
      await visibleBorder();
      expect(await field.boundingBox()).toEqual(bounds);
      await page.mouse.up();
      await expect(input).toHaveValue("");
      await expect(input).toBeFocused();
      await expect(clear).toHaveCount(0);
      expect(await field.boundingBox()).toEqual(bounds);
      await visibleBorder();
      const automaticSearch = page.waitForRequest(
        (request) => new URL(request.url()).searchParams.get("number") === "X".repeat(100),
      );
      await input.fill("X".repeat(101));
      await expect(input).toHaveValue("X".repeat(100));
      await automaticSearch;
      await expect(
        page.getByRole("combobox", { name: "Производитель искомой детали" }),
      ).toBeEnabled();
    });
  });
}
