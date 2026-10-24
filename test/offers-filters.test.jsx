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
} from "./app-test-helpers";
const goods = [
  {
    goodsID: "a",
    brand: "ASAM",
    number: "1",
    name: "Деталь",
    warehouses: [
      { code: "Первый", price: 20, stock: 2 },
      { code: "Второй", price: 10, stock: 0 },
    ],
  },
  { goodsID: "b", brand: "FEBI", number: "2", name: "Без складских предложений", warehouses: [] },
];
const rows = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1].textContent);
async function open(data = goods) {
  stubFetch({ goods: data });
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
it("фильтрует наличие сразу, включает деталь без складских предложений в отсутствие и сохраняет фокус", async () => {
  const user = await open();
  const select = screen.getByRole("combobox", { name: "Наличие" });
  expect(rows()).toEqual(["Первый", "Второй", "Нет предложений"]);
  expect(screen.queryByRole("button", { name: "Сбросить фильтры" })).toBeNull();
  await user.selectOptions(select, "in");
  expect(rows()).toEqual(["Первый"]);
  expect(screen.getByText("Показано 1 из 3")).toBeVisible();
  expect(select).toHaveFocus();
  expect(location.search).toContain("stock=in");
  await user.selectOptions(select, "out");
  expect(rows()).toEqual(["Второй", "Нет предложений"]);
  expect(screen.getByText("Показано 2 из 3.")).toHaveAttribute("role", "status");
  expect(fetch).toHaveBeenCalledTimes(1);
  await expectAccessible();
});
it("сбрасывает пустой результат фильтрации, сохраняя сортировку и не делая запросов", async () => {
  const user = await open(
    [goods[0], { ...goods[1], warehouses: [{ code: "Третий", price: 5, stock: 1 }] }].map(
      (part) => ({ ...part, warehouses: part.warehouses.filter((w) => w.stock > 0) }),
    ),
  );
  await closeOfferFilters(user);
  await user.click(screen.getByRole("button", { name: "Цена" }));
  await openOfferFilters(user);
  const select = screen.getByRole("combobox", { name: "Наличие" });
  await user.selectOptions(select, "out");
  expect(screen.getByText("Ничего не найдено по выбранным фильтрам")).toBeVisible();
  expect(screen.getByText("Показано 0 из 2")).toBeVisible();
  expect(screen.queryByRole("table")).toBeNull();
  expect(select).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
  expect(rows()).toEqual(["Третий", "Первый"]);
  expect(screen.getByText("Строк: 2")).toBeVisible();
  expect(location.search).toContain("sort=price&order=asc");
  expect(location.search).not.toContain("stock=");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("восстанавливает наличие из ссылки и сбрасывает при новом артикуле и производителе, сохраняя сортировку", async () => {
  history.replaceState(null, "", "/?stock=out&sort=price&order=desc&utm=mail#results");
  const user = await open();
  expect(rows()).toEqual(["Второй", "Нет предложений"]);
  fetch.mockResolvedValue({ ok: true, json: async () => ({ goods }) });
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
  expect(rows()).toEqual(["Первый", "Второй", "Нет предложений"]);
  expect(screen.getByRole("combobox", { name: "Наличие" })).toHaveValue("");
  await user.selectOptions(screen.getByRole("combobox", { name: "Наличие" }), "in");
  await closeOfferFilters(user);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Производитель искомой детали" }),
    "FEBI",
  );
  await screen.findByRole("table");
  await openOfferFilters(user);
  expect(rows()).toEqual(["Первый", "Второй", "Нет предложений"]);
  expect(location.search).toContain("sort=price&order=desc");
  expect(location.search).not.toContain("stock=");
  expect(location.search).toContain("utm=mail");
  expect(location.hash).toBe("#results");
});
it("вычищает невалидное наличие из ссылки", async () => {
  history.replaceState(null, "", "/?stock=unknown");
  await open();
  expect(rows()).toEqual(["Первый", "Второй", "Нет предложений"]);
  expect(location.search).not.toContain("stock=");
});
