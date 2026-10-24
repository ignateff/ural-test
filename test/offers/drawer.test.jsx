// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, stubFetch, expectAccessible } from "../support/app-test-helpers";
const goods = [
  {
    goodsID: "a",
    brand: "ASAM",
    number: "1",
    warehouses: [
      { code: "Первый", price: 10, stock: 2 },
      { code: "Второй", price: 20, stock: 0 },
    ],
    analogues: [
      {
        goodsID: "b",
        brand: "FEBI",
        number: "2",
        warehouses: [{ code: "Второй", price: 30, stock: 1 }],
      },
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
  const fetch = stubFetch({ goods });
  renderApp({ number: "1", brand: "ASAM" });
  await screen.findByRole("button", { name: /^Настроить фильтры/ });
  return { user: userEvent.setup(), fetch };
}
it("открывает панель фильтров по кнопке в шапке результатов и возвращает фокус после закрытия", async () => {
  const { user, fetch } = await open();
  const trigger = screen.getByRole("button", { name: "Настроить фильтры" });
  expect(screen.getByRole("combobox", { name: "Сортировка" })).toBeVisible();
  expect(screen.queryByRole("combobox", { name: "Наличие" })).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  await user.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Фильтры" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  const close = within(dialog).getByRole("button", { name: "Закрыть фильтры" });
  expect(close).toHaveFocus();
  expect(within(dialog).getByRole("combobox", { name: "Наличие" })).toBeVisible();
  await user.click(close);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(trigger).toHaveFocus();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("восстанавливает пять групп из ссылки, удаляет теги снаружи панели и сбрасывает фильтры без смены сортировки", async () => {
  history.replaceState(
    null,
    "",
    "/?stock=in&wh=Второй&brands=FEBI&kind=analogue&priceFrom=15&priceTo=35&sort=price&order=desc&utm=mail#results",
  );
  const { user, fetch } = await open();
  const trigger = screen.getByRole("button", { name: "Настроить фильтры (5)" });
  expect(screen.getByRole("button", { name: "Удалить склад Второй" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Удалить производителя FEBI" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Убрать фильтр наличия" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Убрать фильтр типа строки" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Убрать диапазон цены" })).toBeVisible();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("Показано 1 из 3")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Удалить производителя FEBI" }));
  expect(location.search).not.toContain("brands=");
  expect(new URLSearchParams(location.search).get("wh")).toBe("Второй");
  await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
  expect(trigger).toHaveAccessibleName("Настроить фильтры");
  expect(trigger).toHaveFocus();
  expect(screen.getByText("Строк: 3")).toBeVisible();
  expect(location.search).toContain("sort=price&order=desc");
  expect(location.search).toContain("utm=mail");
  expect(location.hash).toBe("#results");
  expect(screen.queryByRole("button", { name: "Сбросить фильтры" })).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("применяет фильтры внутри панели сразу, сохраняет их в URL и показывает теги после возврата к предложениям", async () => {
  window.innerWidth = 390;
  const { user, fetch } = await open();
  const trigger = screen.getByRole("button", { name: "Настроить фильтры" });
  await user.click(trigger);
  await user.selectOptions(screen.getByRole("combobox", { name: "Наличие" }), "in");
  await user.click(screen.getByRole("button", { name: "Склад: Все склады" }));
  await user.click(screen.getByRole("checkbox", { name: "Второй" }));
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog", { name: "Фильтры" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Склад: Выбрано: 1" })).toHaveFocus();
  expect(screen.getByRole("button", { name: "К предложениям (1)" })).toBeVisible();
  expect(
    within(screen.getByRole("dialog", { name: "Фильтры" })).getByRole("status"),
  ).toHaveTextContent("Подходящих предложений: 1 из 3.");
  expect(new URLSearchParams(location.search).get("stock")).toBe("in");
  expect(new URLSearchParams(location.search).getAll("wh")).toEqual(["Второй"]);
  await expectAccessible();
  await user.click(screen.getByRole("button", { name: "К предложениям (1)" }));
  expect(trigger).toHaveAccessibleName("Настроить фильтры (2)");
  expect(trigger).toHaveFocus();
  expect(screen.getByRole("button", { name: "Удалить склад Второй" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Убрать фильтр наличия" })).toBeVisible();
  expect(screen.getByText("Показано 1 из 3")).toBeVisible();
  await expectAccessible();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("сохраняет доступ к сбросу и настройке при пустом результате, снимает блокировку прокрутки после закрытия", async () => {
  history.replaceState(null, "", "/?priceFrom=1000&sort=price&order=asc");
  const { user } = await open();
  expect(screen.getByText("Ничего не найдено по выбранным фильтрам")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Настроить фильтры (1)" }));
  expect(document.body.style.overflow).toBe("hidden");
  await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
  expect(screen.getByRole("button", { name: "Закрыть фильтры" })).toHaveFocus();
  expect(screen.getByRole("button", { name: "К предложениям (3)" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "К предложениям (3)" }));
  expect(document.body.style.overflow).toBe("");
  expect(screen.getByRole("table")).toBeVisible();
  expect(location.search).toContain("sort=price&order=asc");
});

it("показывает сброс пустого результата даже при свёрнутой мобильной панели", async () => {
  window.innerWidth = 320;
  history.replaceState(null, "", "/?priceFrom=100&sort=price&order=desc");
  stubFetch({
    goods: [{ brand: "ASAM", number: "1", warehouses: [{ code: "А", price: 10, stock: 2 }] }],
  });
  renderApp({ number: "1", brand: "ASAM" });
  await screen.findByText("Ничего не найдено по выбранным фильтрам");
  expect(screen.getByRole("button", { name: "Настроить фильтры (1)" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  const reset = screen.getByRole("button", { name: "Сбросить фильтры" });
  expect(reset).toBeVisible();
  await userEvent.setup().click(reset);
  await screen.findByRole("table");
  expect(location.search).toContain("sort=price&order=desc");
});
