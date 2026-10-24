// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, stubFetch } from "../support/app-test-helpers";
const goods = [
  {
    goodsID: "a",
    brand: "Бета",
    number: "1",
    name: "Первое",
    warehouses: [
      { code: "Я", price: 20, stock: 2 },
      { code: "А", price: 10, stock: 5 },
    ],
  },
  {
    goodsID: "b",
    brand: "Альфа",
    number: "2",
    name: "Второе",
    warehouses: [{ code: "Б", price: 20, stock: 1 }],
  },
  { goodsID: "c", brand: "Гамма", number: "3", name: "Без предложений", warehouses: [] },
];
const order = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1].textContent);
async function open(search = { number: "1", brand: "Бета" }) {
  stubFetch({ goods }, { goods });
  renderApp(search);
  await screen.findByRole("table");
  return userEvent.setup();
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  history.replaceState(null, "", "/");
});
it("сортирует складские предложения по цене устойчиво, держит строки без цены в конце и возвращает порядок поставщика", async () => {
  const user = await open();
  const button = screen.getByRole("button", { name: "Цена" });
  await user.click(button);
  expect(order()).toEqual(["А", "Я", "Б", "Нет предложений"]);
  expect(button.closest("th")).toHaveAttribute("aria-sort", "ascending");
  expect(button).toHaveFocus();
  expect(location.search).toContain("sort=price&order=asc");
  expect(screen.getByText("Сортировка: Цена, по возрастанию.")).toHaveAttribute("role", "status");
  await user.keyboard("{Enter}");
  expect(order()).toEqual(["Я", "Б", "А", "Нет предложений"]);
  expect(button.closest("th")).toHaveAttribute("aria-sort", "descending");
  await user.keyboard(" ");
  expect(order()).toEqual(["Я", "А", "Б", "Нет предложений"]);
  expect(location.search).not.toContain("sort=");
  expect(location.search).not.toContain("order=");
});
it.each([
  ["Остаток", ["Нет предложений", "Б", "Я", "А"], ["А", "Я", "Б", "Нет предложений"]],
  [
    "Деталь / производитель",
    ["Б", "Я", "А", "Нет предложений"],
    ["Нет предложений", "Я", "А", "Б"],
  ],
  ["Склад", ["А", "Б", "Нет предложений", "Я"], ["Я", "Нет предложений", "Б", "А"]],
])(
  "переключает оба направления колонки %s без запроса поставщику",
  async (name, ascending, descending) => {
    const user = await open();
    const button = screen.getByRole("button", { name });
    await user.click(button);
    expect(order()).toEqual(ascending);
    await user.keyboard("{Enter}");
    expect(order()).toEqual(descending);
    await user.keyboard("{Enter}");
    expect(order()).toEqual(["Я", "А", "Б", "Нет предложений"]);
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);
it("восстанавливает сортировку из ссылки, сохраняет её при новом подборе и перезагрузке", async () => {
  history.replaceState(null, "", "/?number=1&brand=Бета&sort=stock&order=desc&utm=mail#results");
  const user = await open();
  expect(order()).toEqual(["А", "Я", "Б", "Нет предложений"]);
  // Новая искомая деталь сохраняет выбранный порядок.
  fetch.mockResolvedValue({ ok: true, json: async () => ({ goods }) });
  await user.clear(screen.getByRole("textbox", { name: "Артикул детали" }));
  await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "2");
  await screen.findByRole("option", { name: "Альфа" });
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Производитель искомой детали" }),
    "Бета",
  );
  await screen.findByRole("table");
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Производитель искомой детали" }),
    "Альфа",
  );
  await screen.findByRole("table");
  expect(order()).toEqual(["А", "Я", "Б", "Нет предложений"]);
  expect(location.search).toContain("sort=stock&order=desc");
  expect(location.search).toContain("utm=mail");
  expect(location.hash).toBe("#results");
  cleanup();
  await open({ number: "2", brand: "Альфа" });
  expect(order()).toEqual(["А", "Я", "Б", "Нет предложений"]);
});
it("удаляет невалидные параметры сортировки из ссылки", async () => {
  history.replaceState(null, "", "/?sort=bogus&order=desc&utm=mail#results");
  await open();
  expect(order()).toEqual(["Я", "А", "Б", "Нет предложений"]);
  expect(location.search).not.toContain("sort=");
  expect(location.search).not.toContain("order=");
  expect(location.search).toContain("utm=mail");
});
it("компактный селект предлагает тот же порядок и сохраняет фокус", async () => {
  const user = await open();
  const select = screen.getByRole("combobox", { name: "Сортировка" });
  await user.selectOptions(select, "price:desc");
  expect(order()).toEqual(["Я", "Б", "А", "Нет предложений"]);
  expect(select).toHaveFocus();
  await user.selectOptions(select, "");
  expect(order()).toEqual(["Я", "А", "Б", "Нет предложений"]);
});
