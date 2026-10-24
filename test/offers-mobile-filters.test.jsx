// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, stubFetch, expectAccessible } from "./app-test-helpers";
const goods = [
  {
    brand: "ASAM",
    number: "1",
    warehouses: [{ code: "А", price: 10, stock: 2 }],
    analogues: [{ brand: "FEBI", number: "2", warehouses: [{ code: "Б", price: 20, stock: 1 }] }],
  },
];
async function open() {
  window.innerWidth = 390;
  stubFetch({ goods });
  renderApp({ number: "1", brand: "ASAM" });
  await screen.findByRole("table");
  return userEvent.setup();
}
afterEach(() => {
  cleanup();
  window.innerWidth = 1024;
  vi.unstubAllGlobals();
  history.replaceState(null, "", "/");
});
it("открывает панель с клавиатуры, считает активные группы и сохраняет фильтры после закрытия", async () => {
  const user = await open();
  const toggle = screen.getByRole("button", { name: "Настроить фильтры" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("combobox", { name: "Наличие" })).toBeNull();
  expect(screen.getByRole("combobox", { name: "Сортировка" })).toBeVisible();
  toggle.focus();
  await user.keyboard("{Enter}");
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(document.getElementById(toggle.getAttribute("aria-controls"))).toBeVisible();
  await user.selectOptions(screen.getByRole("combobox", { name: "Наличие" }), "in");
  await user.click(screen.getByRole("button", { name: "Склад: Все склады" }));
  await user.click(screen.getByRole("checkbox", { name: "А" }));
  await user.click(screen.getByRole("checkbox", { name: "Б" }));
  await user.type(screen.getByRole("spinbutton", { name: "Цена от" }), "1");
  await user.type(screen.getByRole("spinbutton", { name: "Цена до" }), "50");
  expect(toggle).toHaveAccessibleName("Настроить фильтры (3)");
  await user.click(screen.getByRole("button", { name: "К предложениям (2)" }));
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(toggle).toHaveFocus();
  expect(screen.queryByRole("combobox", { name: "Наличие" })).toBeNull();
  expect(screen.getByText("Показано 2 из 2")).toBeVisible();
  await user.keyboard(" ");
  expect(screen.getByRole("combobox", { name: "Наличие" })).toHaveValue("in");
  await expectAccessible();
});
it("оставляет панель закрытой при восстановленных фильтрах и сортирует без открытия", async () => {
  history.replaceState(null, "", "/?stock=in&kind=original&priceFrom=1&priceTo=30");
  const user = await open();
  const toggle = screen.getByRole("button", { name: "Настроить фильтры (3)" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("combobox", { name: "Тип строки" })).toBeNull();
  expect(screen.getByText("Показано 1 из 2")).toBeVisible();
  await user.selectOptions(screen.getByRole("combobox", { name: "Сортировка" }), "price:desc");
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  await user.click(toggle);
  expect(screen.getByRole("combobox", { name: "Тип строки" })).toHaveValue("original");
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
});
