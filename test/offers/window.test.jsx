// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, stubFetch, openOfferFilters } from "../support/app-test-helpers";
const goods = Array.from({ length: 300 }, (_, i) => ({
  goodsID: `p${i}`,
  brand: "ASAM",
  number: `part-${i}`,
  warehouses: [{ code: "Склад", price: i + 1, stock: i < 3 ? 1 : 0 }],
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  history.replaceState(null, "", "/");
});
it("длинный подбор рисует окно, сохраняя полный счётчик и доступные индексы", async () => {
  stubFetch({ goods });
  renderApp({ number: "part", brand: "ASAM" });
  const table = await screen.findByRole("table");
  expect(table).toHaveAttribute("aria-rowcount", "301");
  expect(screen.getByText("Строк: 300")).toBeVisible();
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.length).toBeLessThan(100);
  expect(rows[0]).toHaveAttribute("aria-rowindex", "2");
  expect(rows[0]).toHaveTextContent("part-0");
});
it("фильтрация и сортировка действуют на полный подбор, короткий результат целиком доступен", async () => {
  stubFetch({ goods });
  renderApp({ number: "part", brand: "ASAM" });
  await screen.findByRole("table");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Цена" }));
  await user.click(screen.getByRole("button", { name: "Цена" }));
  expect(screen.getByRole("button", { name: "Цена" })).toHaveFocus();
  expect(within(screen.getByRole("table")).getAllByRole("row")[1]).toHaveTextContent("part-299");
  await openOfferFilters(user);
  await user.selectOptions(screen.getByRole("combobox", { name: "Наличие" }), "in");
  const table = screen.getByRole("table");
  expect(table).toHaveAttribute("aria-rowcount", "4");
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows).toHaveLength(3);
  expect(rows[0]).toHaveTextContent("part-2");
  expect(rows[2]).toHaveTextContent("part-0");
  expect(screen.getByText("Показано 3 из 300")).toBeVisible();
  expect(fetch).toHaveBeenCalledTimes(1);
});
