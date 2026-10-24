// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderApp,
  stubFetch,
  expectAccessible,
  openOfferFilters,
  closeOfferFilters,
} from "../support/app-test-helpers";
const goods = [
  {
    goodsID: "a",
    brand: "ASAM",
    number: "1",
    name: "Искомая",
    warehouses: [
      { code: "А", price: 10.25, stock: 2 },
      { code: "Б", price: 20.5, stock: 0 },
    ],
    analogues: [
      {
        goodsID: "b",
        brand: "FEBI",
        number: "2",
        name: "Аналог",
        warehouses: [{ code: "В", price: 15.75, stock: 1 }],
      },
      { goodsID: "c", brand: "MEYLE", number: "3", name: "Без предложений", warehouses: [] },
    ],
  },
];
const rows = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1].textContent);
async function open() {
  stubFetch({ goods });
  renderApp({ number: "1", brand: "ASAM" });
  await screen.findByRole("table");
  const user = userEvent.setup();
  await openOfferFilters(user);
  return user;
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  history.replaceState(null, "", "/");
});
it("выбирает искомую деталь и аналоги, сочетая тип с наличием", async () => {
  const user = await open();
  const kind = screen.getByRole("combobox", { name: "Тип строки" });
  await user.selectOptions(kind, "original");
  expect(rows()).toEqual(["А", "Б"]);
  expect(kind).toHaveFocus();
  await user.selectOptions(kind, "analogue");
  expect(rows()).toEqual(["В", "Нет предложений"]);
  await user.selectOptions(screen.getByRole("combobox", { name: "Наличие" }), "in");
  expect(rows()).toEqual(["В"]);
  expect(screen.getByText("Показано 1 из 4")).toBeVisible();
  expect(location.search).toContain("kind=analogue");
  await expectAccessible();
});
it("фильтрует по включительным границам с копейками, поддерживает одну границу и исключает строки без цены", async () => {
  const user = await open();
  const from = screen.getByRole("spinbutton", { name: "Цена от" });
  const to = screen.getByRole("spinbutton", { name: "Цена до" });
  await user.type(from, "10.25");
  expect(rows()).toEqual(["А", "Б", "В"]);
  expect(from).toHaveFocus();
  await user.type(to, "15.75");
  expect(rows()).toEqual(["А", "В"]);
  expect(to).toHaveFocus();
  expect(location.search).toContain("priceFrom=10.25");
  expect(location.search).toContain("priceTo=15.75");
  await user.clear(from);
  expect(rows()).toEqual(["А", "В"]);
  await user.clear(to);
  expect(rows()).toEqual(["А", "Б", "В", "Нет предложений"]);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("показывает пустой результат при обратном диапазоне, сбрасывает фильтры без сортировки", async () => {
  const user = await open();
  await closeOfferFilters(user);
  await user.click(screen.getByRole("button", { name: "Цена" }));
  await openOfferFilters(user);
  await user.type(screen.getByRole("spinbutton", { name: "Цена от" }), "30");
  await user.type(screen.getByRole("spinbutton", { name: "Цена до" }), "10");
  expect(screen.getByText("Ничего не найдено по выбранным фильтрам")).toBeVisible();
  expect(screen.getByText("Показано 0 из 4")).toBeVisible();
  expect(screen.getByRole("spinbutton", { name: "Цена от" })).toHaveValue(30);
  expect(screen.getByRole("spinbutton", { name: "Цена до" })).toHaveValue(10);
  await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
  expect(rows()).toEqual(["А", "В", "Б", "Нет предложений"]);
  expect(location.search).toContain("sort=price&order=asc");
  expect(location.search).not.toContain("priceFrom");
  expect(location.search).not.toContain("priceTo");
});
it("восстанавливает тип и цену из ссылки, очищает при новом подборе и сохраняет сортировку", async () => {
  history.replaceState(
    null,
    "",
    "/?kind=analogue&priceFrom=15.75&priceTo=15.75&sort=price&order=desc",
  );
  const user = await open();
  expect(rows()).toEqual(["В"]);
  expect(screen.getByRole("combobox", { name: "Тип строки" })).toHaveValue("analogue");
  expect(screen.getByRole("spinbutton", { name: "Цена от" })).toHaveValue(15.75);
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ goods: [...goods, { brand: "FEBI", number: "1" }] }),
  });
  await closeOfferFilters(user);
  await user.clear(screen.getByRole("textbox", { name: "Артикул детали" }));
  await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "2");
  await screen.findByRole("option", { name: "FEBI" });
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Производитель искомой детали" }),
    "ASAM",
  );
  await screen.findByRole("table");
  await openOfferFilters(user);
  expect(screen.getByRole("combobox", { name: "Тип строки" })).toHaveValue("");
  expect(screen.getByRole("spinbutton", { name: "Цена от" })).toHaveValue(null);
  expect(location.search).not.toContain("kind=");
  expect(location.search).not.toContain("priceFrom=");
  expect(location.search).toContain("sort=price&order=desc");
});
it("отбрасывает нечисловые, бесконечные границы и неизвестный тип из ссылки", async () => {
  history.replaceState(null, "", "/?kind=wrong&priceFrom=NaN&priceTo=Infinity&utm=mail#results");
  await open();
  expect(rows()).toEqual(["А", "Б", "В", "Нет предложений"]);
  expect(location.search).not.toMatch(/kind|priceFrom|priceTo/);
  expect(location.search).toContain("utm=mail");
  expect(location.hash).toBe("#results");
});

it("показывает нулевую цену, сортирует её перед положительной и включает диапазон 0–0", async () => {
  stubFetch({
    goods: [
      {
        brand: "ASAM",
        number: "1",
        warehouses: [
          { id: "positive", code: "Платный", price: 10, stock: 1 },
          { id: "null", code: "Без цены", price: null, stock: 1 },
          { id: "zero", code: "Нулевой", price: 0, stock: 1 },
        ],
      },
    ],
  });
  renderApp({ number: "1", brand: "ASAM" });
  const table = await screen.findByRole("table");
  const zero = within(table).getByRole("cell", { name: "Нулевой" }).closest("tr");
  expect(within(zero).getByText(/0,00\s?₽/)).toBeVisible();
  const noPrice = within(table).getByRole("cell", { name: "Без цены" }).closest("tr");
  expect(within(noPrice).getByText("—")).toBeVisible();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Цена" }));
  expect(rows()).toEqual(["Нулевой", "Платный", "Без цены"]);
  await openOfferFilters(user);
  await user.type(screen.getByRole("spinbutton", { name: "Цена от" }), "0");
  await user.type(screen.getByRole("spinbutton", { name: "Цена до" }), "0");
  expect(rows()).toEqual(["Нулевой"]);
  expect(location.search).toContain("priceFrom=0&priceTo=0");
});
