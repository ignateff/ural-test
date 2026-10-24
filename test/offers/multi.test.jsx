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
    warehouses: [
      { code: "Первый", price: 20, stock: 2 },
      { code: "Второй", price: 10, stock: 0 },
    ],
    analogues: [
      {
        goodsID: "b",
        brand: "FEBI",
        number: "2",
        warehouses: [{ code: "Второй", price: 30, stock: 3 }],
      },
      { goodsID: "c", brand: "BOSCH", number: "3", warehouses: [] },
    ],
  },
];
const rows = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((r) => r.textContent);
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
it("выбирает склады и производителей: ИЛИ внутри, И между группами, опции стабильны", async () => {
  const user = await open();
  await user.click(screen.getByRole("button", { name: "Склад: Все склады" }));
  const warehouses = within(screen.getByRole("dialog", { name: "Склад: варианты" }));
  expect(warehouses.queryByRole("checkbox", { name: "Нет предложений" })).toBeNull();
  await user.click(warehouses.getByRole("checkbox", { name: "Первый" }));
  expect(rows()).toHaveLength(1);
  await user.click(warehouses.getByRole("checkbox", { name: "Второй" }));
  expect(rows()).toHaveLength(3);
  await user.click(screen.getByRole("button", { name: "Производитель: Все производители" }));
  const febi = screen.getByRole("checkbox", { name: "FEBI" });
  await user.click(febi);
  expect(rows()).toHaveLength(1);
  expect(rows()[0]).toContain("FEBI");
  expect(febi).toHaveFocus();
  await user.click(screen.getByRole("checkbox", { name: "ASAM" }));
  expect(rows()).toHaveLength(3);
  await user.selectOptions(screen.getByRole("combobox", { name: "Наличие" }), "in");
  expect(rows()).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "Производитель: Выбрано: 2" }));
  expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  expect(screen.getByText("Показано 2 из 4")).toBeVisible();
  expect(new URLSearchParams(location.search).getAll("wh")).toEqual(["Первый", "Второй"]);
  expect(new URLSearchParams(location.search).getAll("brands")).toEqual(["FEBI", "ASAM"]);
  expect(new URLSearchParams(location.search).get("brand")).toBe("ASAM");
  expect(fetch).toHaveBeenCalledTimes(1);
  await expectAccessible();
});
it("восстанавливает повторяемые значения, вычищает неизвестные только после ответа и сбрасывает фильтры с сохранением порядка", async () => {
  history.replaceState(
    null,
    "",
    "/?wh=Второй&wh=unknown&brands=FEBI&brands=bad&sort=price&order=desc",
  );
  let release;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    ),
  );
  renderApp({ number: "1", brand: "ASAM" });
  expect(new URLSearchParams(location.search).getAll("wh")).toEqual(["Второй", "unknown"]);
  release({ ok: true, json: async () => ({ goods }) });
  await screen.findByRole("table");
  expect(rows()).toHaveLength(1);
  expect(rows()[0]).toContain("FEBI");
  expect(new URLSearchParams(location.search).getAll("wh")).toEqual(["Второй"]);
  expect(new URLSearchParams(location.search).getAll("brands")).toEqual(["FEBI"]);
  const user = userEvent.setup();
  await openOfferFilters(user);
  await user.click(screen.getByRole("button", { name: "Склад: Выбрано: 1" }));
  await user.click(screen.getByRole("checkbox", { name: "Первый" }));
  await user.click(screen.getByRole("checkbox", { name: "Второй" }));
  expect(screen.getByText("Ничего не найдено по выбранным фильтрам")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
  expect(rows()).toHaveLength(4);
  expect(rows()[0]).toContain("FEBI");
  expect(location.search).toContain("sort=price&order=desc");
  expect(location.search).not.toContain("wh=");
  expect(location.search).not.toContain("brands=");
  await user.click(screen.getByRole("button", { name: "Производитель: Все производители" }));
  await user.click(screen.getByRole("checkbox", { name: "FEBI" }));
  fetch.mockResolvedValue({ ok: true, json: async () => ({ goods }) });
  await closeOfferFilters(user);
  await user.clear(screen.getByRole("textbox", { name: "Артикул детали" }));
  await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "2");
  await screen.findByRole("option", { name: "ASAM" });
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Производитель искомой детали" }),
    "ASAM",
  );
  await screen.findByRole("table");
  expect(rows()).toHaveLength(4);
  await openOfferFilters(user);
  await user.click(screen.getByRole("button", { name: "Производитель: Все производители" }));
  expect(screen.getByRole("checkbox", { name: "FEBI" })).not.toBeChecked();
});
