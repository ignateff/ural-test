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
    brand: "ASAM",
    number: "1",
    warehouses: [
      { code: "Первый", price: 10, stock: 2 },
      { code: "Второй", price: 20, stock: 1 },
    ],
    analogues: [
      { brand: "FEBI", number: "2", warehouses: [{ code: "Второй", price: 30, stock: 1 }] },
    ],
  },
];
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  history.replaceState(null, "", "/");
  window.innerWidth = 1024;
});
async function open() {
  stubFetch({ goods });
  renderApp({ number: "1", brand: "ASAM" });
  await screen.findByRole("table");
  const user = userEvent.setup();
  await openOfferFilters(user);
  return user;
}
it("ищет варианты, выбирает несколько без закрытия и удаляет выбранный тег с сохранением URL и фокуса", async () => {
  const user = await open();
  const trigger = screen.getByRole("button", { name: "Склад: Все склады" });
  expect(screen.queryByRole("checkbox")).toBeNull();
  await user.click(trigger);
  const search = screen.getByRole("searchbox", { name: "Поиск складов" });
  expect(search).toHaveFocus();
  await user.type(search, "пЕР");
  expect(screen.queryByRole("checkbox", { name: "Второй" })).toBeNull();
  await user.click(screen.getByRole("checkbox", { name: "Первый" }));
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "К предложениям (1)" })).toBeVisible();
  expect(screen.getByText("Показано 1 из 3")).toBeVisible();
  await user.clear(search);
  await user.click(screen.getByRole("checkbox", { name: "Второй" }));
  expect(trigger).toHaveAccessibleName("Склад: Выбрано: 2");
  await user.keyboard("{Escape}");
  expect(trigger).toHaveFocus();
  await closeOfferFilters(user);
  await user.click(screen.getByRole("button", { name: "Удалить склад Первый" }));
  expect(new URLSearchParams(location.search).getAll("wh")).toEqual(["Второй"]);
  expect(screen.getByRole("button", { name: "Удалить склад Второй" })).toHaveFocus();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("закрывает один список при открытии другого, очищает поиск и группу, работает с клавиатуры и без совпадений", async () => {
  const user = await open();
  const warehouse = screen.getByRole("button", { name: "Склад: Все склады" });
  warehouse.focus();
  await user.keyboard("{Enter}");
  await user.type(screen.getByRole("searchbox", { name: "Поиск складов" }), "нет такого");
  expect(screen.getByText("Варианты не найдены")).toBeVisible();
  await user.keyboard("{Escape}");
  expect(warehouse).toHaveFocus();
  await user.keyboard(" ");
  expect(screen.getByRole("searchbox", { name: "Поиск складов" })).toHaveValue("");
  await user.tab();
  await user.keyboard(" ");
  expect(screen.getByRole("checkbox", { name: "Второй" })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Производитель: Все производители" }));
  expect(screen.queryByRole("searchbox", { name: "Поиск складов" })).toBeNull();
  await user.click(screen.getByRole("checkbox", { name: "ASAM" }));
  await expectAccessible();
  await user.click(screen.getByRole("button", { name: "Очистить выбор" }));
  expect(screen.queryByRole("button", { name: "Удалить производителя ASAM" })).toBeNull();
  expect(new URLSearchParams(location.search).getAll("wh")).toEqual(["Второй"]);
  expect(new URLSearchParams(location.search).getAll("brands")).toEqual([]);
  await user.click(screen.getByRole("combobox", { name: "Тип строки" }));
  expect(screen.queryByRole("dialog", { name: "Производитель: варианты" })).toBeNull();
});
it("восстанавливает теги из ссылки и после удаления сохраняет фокус на следующем теге", async () => {
  window.innerWidth = 390;
  history.replaceState(null, "", "/?wh=Первый&brands=ASAM");
  const user = await open();
  await closeOfferFilters(user);
  await user.click(screen.getByRole("button", { name: "Удалить склад Первый" }));
  expect(screen.getByRole("button", { name: "Удалить производителя ASAM" })).toHaveFocus();
  expect(new URLSearchParams(location.search).getAll("wh")).toEqual([]);
  await openOfferFilters(user);
  await user.click(screen.getByRole("button", { name: "Производитель: Выбрано: 1" }));
  expect(screen.getByRole("checkbox", { name: "ASAM" })).toBeChecked();
  await closeOfferFilters(user);
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("после вариантов Tab переходит к следующему фильтру и закрывает список", async () => {
  const user = await open();
  await user.click(screen.getByRole("button", { name: "Склад: Все склады" }));
  await user.tab();
  await user.tab();
  await user.tab();
  expect(screen.getByRole("button", { name: "Производитель: Все производители" })).toHaveFocus();
  expect(screen.queryByRole("dialog", { name: "Склад: варианты" })).toBeNull();
});
it.each([
  ["Склад: Все склады", "Склад: варианты", "Первый", "wh"],
  ["Производитель: Все производители", "Производитель: варианты", "ASAM", "brands"],
])(
  "выбирает и снимает вариант по названию, сохраняя клик по чекбоксу и клавишу Space: %s",
  async (triggerName, dialogName, value, param) => {
    const user = await open();
    await user.click(screen.getByRole("button", { name: triggerName }));
    const popup = screen.getByRole("dialog", { name: dialogName });
    const text = within(popup).getByText(value, { exact: true });
    const checkbox = within(popup).getByRole("checkbox", { name: value });
    await user.click(text);
    expect(checkbox).toBeChecked();
    expect(popup).toBeVisible();
    expect(new URLSearchParams(location.search).getAll(param)).toEqual([value]);
    await user.click(text);
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveFocus();
    await user.keyboard(" ");
    expect(checkbox).not.toBeChecked();
    expect(new URLSearchParams(location.search).getAll(param)).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);
