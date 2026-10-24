// @vitest-environment jsdom
// JSDOM проверяет общие данные, семантику и одно представление результата:
// мобильная и настольная вёрстки используют одну таблицу — одна строка на
// складское предложение, подписи данных берутся из data-label и заголовков.
// Геометрию карточного режима (медиазапрос, отсутствие горизонтальной прокрутки,
// видимость подписей) JSDOM не проверяет: её проверяют в настоящем браузере.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectAccessible, renderApp, stubFetch } from "../support/app-test-helpers";

const TABLE_NAME = "Найденные детали и предложения по складам";

// Одна искомая деталь с двумя складами и два аналога: один со складом,
// второй без складских предложений.
const fixture = [
  {
    goodsID: "original",
    brand: "ASAM",
    number: "01089",
    name: "Фильтр топливный",
    warehouses: [
      { id: "w-dmd", code: "ДМД", price: 86.88, stock: 28 },
      { id: "w-msk", code: "МСК", price: 92.5, stock: 0 },
    ],
    analogues: [
      {
        goodsID: "analogue",
        brand: "MEYLE",
        number: "01089-ANALOGUE-LONG-ARTICLE",
        name: "Аналог фильтра топливного с очень длинным наименованием",
        warehouses: [{ id: "w-spb", code: "СПБ", price: 74.1, stock: 3 }],
      },
      {
        goodsID: "no-offers",
        brand: "FEBI",
        number: "01089-WITHOUT-WAREHOUSES",
        name: "Аналог без складских предложений",
        warehouses: [],
      },
    ],
  },
];

const brandsResponse = {
  goods: [
    { goodsID: "b1", brand: "ASAM", number: "01089" },
    { goodsID: "b2", brand: "FEBI", number: "01089" },
    { goodsID: "b3", brand: "MEYLE", number: "01089" },
  ],
};

async function searchForAsam() {
  stubFetch(brandsResponse, { goods: fixture });
  const user = userEvent.setup();
  renderApp();
  await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "01089");
  await screen.findByRole("option", { name: "ASAM" });
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Производитель искомой детали" }),
    "ASAM",
  );
  const table = await screen.findByRole("table", { name: TABLE_NAME });
  return { user, table };
}

// Ищем строку по названию склада: у одного склада одно предложение.
function rowWithWarehouse(table, warehouse) {
  return within(table).getByRole("cell", { name: warehouse }).closest("tr");
}

const money = (digits) => new RegExp(`${digits}\\s?₽`);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Общие данные и семантика складских предложений", () => {
  it("показывает аналог с его складским предложением, длинными значениями и своим признаком", async () => {
    const { table } = await searchForAsam();
    const row = rowWithWarehouse(table, "СПБ");

    expect(within(row).getByText("MEYLE")).toBeVisible();
    expect(within(row).getByText("01089-ANALOGUE-LONG-ARTICLE")).toBeVisible();
    expect(
      within(row).getByText("Аналог фильтра топливного с очень длинным наименованием"),
    ).toBeVisible();
    expect(within(row).getByText("Аналог")).toBeVisible();
    expect(within(row).getByText(money("74,10"))).toBeVisible();
    expect(within(row).getByText("3 шт.")).toBeVisible();
    expect(within(row).queryByText("Искомая деталь")).toBeNull();
  });

  it("показывает результаты одним представлением: без второй карточной разметки и дублей", async () => {
    const { table } = await searchForAsam();
    const results = screen.getByRole("region", { name: "Детали и предложения" });

    expect(within(results).getAllByRole("table")).toHaveLength(1);
    expect(within(results).queryAllByRole("list")).toHaveLength(0);
    expect(within(results).getAllByRole("row")).toHaveLength(5);
    for (const warehouse of ["ДМД", "МСК", "СПБ", "Нет предложений"]) {
      expect(within(within(results).getByRole("table")).getAllByText(warehouse)).toHaveLength(1);
    }
    // Каждая ячейка со значением повторяет подпись своей колонки (data-label),
    // чтобы карточка показывала те же подписи, что и заголовки таблицы.
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent.trim());
    const dataLabels = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) =>
        within(row)
          .getAllByRole("cell")
          .slice(1)
          .map((cell) => cell.getAttribute("data-label")),
      );
    for (const labels of dataLabels) {
      expect(labels).toEqual(headers.slice(1));
    }
    await expectAccessible();
  });
});
