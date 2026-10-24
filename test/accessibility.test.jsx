// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectAccessible, renderApp, stubFetch } from "./app-test-helpers";

const goods = [
  {
    goodsID: "part-1",
    brand: "ASAM",
    number: "01089",
    name: "Фильтр топливный",
    warehouses: [{ id: "warehouse-1", code: "ДМД", price: 86.88, stock: 28 }],
  },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Доступность поиска", () => {
  it("проверяет стартовый экран axe и связывает поле с подписью и подсказкой", async () => {
    renderApp();
    const input = screen.getByRole("textbox", { name: "Артикул детали" });
    expect(input).toHaveAccessibleDescription(
      "Поиск начнётся автоматически после ввода.",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("link", { name: "К основному содержимому" }),
    ).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("combobox")).toBeDisabled();
    await expectAccessible();
  });

  it("позволяет пройти оба этапа клавиатурой и объявляет краткий результат", async () => {
    const fetch = stubFetch({ goods }, { goods });
    const user = userEvent.setup();
    renderApp();

    await user.tab();
    expect(
      screen.getByRole("link", { name: "К основному содержимому" }),
    ).toHaveFocus();
    await user.tab(); // Логотип.
    await user.tab();
    expect(
      screen.getByRole("textbox", { name: "Артикул детали" }),
    ).toHaveFocus();
    await user.keyboard("01089");
    await screen.findByRole("option", { name: "ASAM" });
    const brand = screen.getByRole("combobox", { name: "Производитель искомой детали" });
    expect(brand).toHaveValue("");

    await expectAccessible();

    await user.tab(); // Очистить артикул.
    await user.tab();
    expect(brand).toHaveFocus();
    await user.selectOptions(brand, "ASAM");
    const table = await screen.findByRole("table", {
      name: "Найденные детали и предложения по складам",
    });
    expect(brand).toHaveFocus();
    expect(brand).toHaveValue("ASAM");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Деталь / производитель", "Склад", "Цена", "Остаток"]);
    expect(
      within(table).getByRole("cell", { name: "28 шт." }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("status")
        .some((node) =>
          node.textContent.includes("Поиск завершён. Строк в таблице: 1."),
        ),
    ).toBe(true);
    // Обновление не заставляет скринридер читать всю таблицу как live region.
    expect(
      table.closest("[aria-live], [role='status'], [role='alert']"),
    ).toBeNull();
    const url = new URL(fetch.mock.calls[1][0]);
    expect(url.searchParams.get("brand")).toBe("ASAM");
    expect(url.searchParams.get("analogues")).toBe("on");
    await expectAccessible();
  });

  it("показывает полное выбранное название производителя рядом со списком", async () => {
    const name = "Производитель с очень длинным наименованием без сокращений";
    stubFetch({ goods: [{ ...goods[0], brand: name }] }, { goods: [] });
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "01089");
    await screen.findByRole("option", { name });
    const selector = screen.getByRole("combobox");
    await user.selectOptions(selector, name);
    expect(selector).toHaveAccessibleDescription(`Выбран производитель: ${name}`);
    expect(screen.getByText(`Выбран производитель: ${name}`)).toBeVisible();
    expect(selector).toHaveFocus();
  });

  it("меняет производителя с сохранением артикула и сбрасывает подбор при новом артикуле", async () => {
    const fetch = stubFetch({ goods: [...goods, { ...goods[0], brand: "FEBI" }] }, { goods }, { goods: [{ ...goods[0], brand: "FEBI" }] }, { goods: [] });
    const user = userEvent.setup();
    renderApp();
    const input = screen.getByRole("textbox", { name: "Артикул детали" });
    await user.type(input, "01089");
    await screen.findByRole("option", { name: "ASAM" });
    const selector = screen.getByRole("combobox");
    await user.selectOptions(selector, "ASAM");
    await screen.findByRole("table");
    await user.selectOptions(selector, "FEBI");
    await screen.findByRole("table");
    expect(selector).toHaveFocus();
    expect(input).toHaveValue("01089");
    expect(new URL(fetch.mock.calls[2][0]).searchParams.get("brand")).toBe("FEBI");
    await user.type(input, "1");
    expect(input).toHaveFocus();
    expect(selector).toHaveValue("");
    expect(selector).toBeDisabled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await screen.findByRole("option", { name: "Производители не найдены" });
    expect(input).toHaveFocus();
  });

  it("не возвращает производителей из устаревшего ответа после смены артикула", async () => {
    let resolveOld;
    const fetch = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ goods: [{ ...goods[0], brand: "FEBI" }] }) });
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderApp();
    const input = screen.getByRole("textbox", { name: "Артикул детали" });
    await user.type(input, "01089");
    expect(fetch).not.toHaveBeenCalled();
    await screen.findByText("Ищем производителей…", { selector: "p" });
    expect(screen.getByRole("combobox")).toBeDisabled();
    await user.type(input, "1");
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    await screen.findByRole("option", { name: "FEBI" });
    await act(async () => { resolveOld({ ok: true, json: async () => ({ goods }) }); });
    expect(screen.queryByRole("option", { name: "ASAM" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeEnabled();
    expect(input).toHaveValue("010891");
    expect(input).toHaveFocus();
  });

  it("не возвращает устаревшие предложения после смены производителя или очистки", async () => {
    let resolveOld;
    let resolveAfterClear;
    const fetch = stubFetch({ goods: [...goods, { ...goods[0], brand: "FEBI" }] });
    fetch.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ goods: [{ ...goods[0], brand: "FEBI", name: "Актуальная деталь" }] }) });
    fetch.mockImplementationOnce(() => new Promise((resolve) => { resolveAfterClear = resolve; }));
    const user = userEvent.setup();
    renderApp();
    const input = screen.getByRole("textbox", { name: "Артикул детали" });
    await user.type(input, "01089");
    await screen.findByRole("option", { name: "ASAM" });
    const selector = screen.getByRole("combobox");
    await user.selectOptions(selector, "ASAM");
    await screen.findByText("Загружаем предложения и аналоги…");
    await user.selectOptions(selector, "FEBI");
    await screen.findByRole("cell", { name: /Актуальная деталь/ });
    await act(async () => { resolveOld({ ok: true, json: async () => ({ goods }) }); });
    expect(screen.queryByRole("cell", { name: /Фильтр топливный/ })).not.toBeInTheDocument();
    expect(selector).toHaveValue("FEBI");
    expect(selector).toHaveFocus();
    expect(input).toHaveValue("01089");
    await user.selectOptions(selector, "ASAM");
    await screen.findByText("Загружаем предложения и аналоги…");
    await user.click(screen.getByRole("button", { name: "Очистить артикул" }));
    await act(async () => { resolveAfterClear({ ok: true, json: async () => ({ goods }) }); });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(selector).toBeDisabled();
    expect(selector).toHaveValue("");
    expect(screen.queryByRole("option", { name: "ASAM" })).not.toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("сохраняет фокус в поле после очистки клавиатурой", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.tab();
    await user.tab();
    await user.tab();
    const input = screen.getByRole("textbox", { name: "Артикул детали" });
    await user.keyboard("01089");
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Очистить артикул" }),
    ).toHaveFocus();
    await user.keyboard(" ");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "Очистить артикул" }),
    ).not.toBeInTheDocument();
  });

  it("объявляет загрузку и пустой результат производителей", async () => {
    let resolveRequest;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveRequest = resolve;
          }),
      ),
    );
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "01089" }));
    expect(await screen.findByText("Ищем производителей…", { selector: "p" })).toHaveAttribute(
      "role",
      "status",
    );
    await expectAccessible();
    resolveRequest({ ok: true, json: async () => ({ goods: [{}] }) });
    const message =
      "По артикулу «01089» ничего не найдено. Проверьте номер детали.";
    await screen.findAllByText(message);
    expect(
      screen
        .getAllByRole("status")
        .some((node) => node.textContent === message),
    ).toBe(true);
    await expectAccessible();
  });

  it("объявляет ошибку и позволяет повторить запрос клавиатурой", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ goods }) });
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "01089" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось связаться с поставщиком",
    );
    await expectAccessible();
    // Пример исчез после ввода, следующий Tab возвращает к ссылке пропуска.
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Повторить" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("option", { name: "ASAM" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("помечает регион занятым, пока его запрос не завершён", async () => {
    let resolveBrands;
    let resolveOffers;
    const fetch = vi.fn();
    fetch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveBrands = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOffers = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderApp();
    const brandsRegion = screen.getByRole("region", { name: "Подбор детали" });
    const offersRegion = screen.getByRole("region", {
      name: "Детали и предложения",
    });
    expect(brandsRegion).toHaveAttribute("aria-busy", "false");
    expect(offersRegion).toHaveAttribute("aria-busy", "false");

    await user.type(
      screen.getByRole("textbox", { name: "Артикул детали" }),
      "01089",
    );
    await screen.findByText("Ищем производителей…", { selector: "p" });
    expect(brandsRegion).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolveBrands({ ok: true, json: async () => ({ goods }) });
    });
    await screen.findByRole("option", { name: "ASAM" });
    expect(brandsRegion).toHaveAttribute("aria-busy", "false");

    await user.selectOptions(screen.getByRole("combobox"), "ASAM");
    await screen.findByText("Загружаем предложения и аналоги…");
    expect(offersRegion).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolveOffers({ ok: true, json: async () => ({ goods }) });
    });
    await screen.findByRole("table");
    expect(offersRegion).toHaveAttribute("aria-busy", "false");
  });

  it("объявляет загрузку и ошибку предложений, затем пустой результат повтора", async () => {
    let rejectOffers;
    const fetch = stubFetch({ goods });
    fetch.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectOffers = reject;
        }),
    );
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ goods: [] }),
    });
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "01089" }));
    await screen.findByRole("option", { name: "ASAM" });
    await user.selectOptions(screen.getByRole("combobox"), "ASAM");
    expect(
      await screen.findByText("Загружаем предложения и аналоги…"),
    ).toHaveAttribute("role", "status");
    await expectAccessible();
    rejectOffers(new TypeError("Failed to fetch"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось связаться с поставщиком",
    );
    await expectAccessible();
    await user.tab();
    expect(screen.getByRole("button", { name: "Повторить" })).toHaveFocus();
    await user.keyboard("{Enter}");
    const message = "Для выбранного производителя предложения не найдены.";
    await screen.findAllByText(message);
    expect(
      screen
        .getAllByRole("status")
        .some((node) => node.textContent === message),
    ).toBe(true);
    await expectAccessible();
  });
});

async function showOffers(user, data) {
  stubFetch({ goods: data }, { goods: data });
  renderApp();
  await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "01089");
  await screen.findByRole("option", { name: data[0].brand });
  await user.selectOptions(screen.getByRole("combobox"), data[0].brand);
  return screen.findByRole("table", {
    name: "Найденные детали и предложения по складам",
  });
}

// Текст строки в порядке чтения, без привязки к CSS-классам и вложенности.
function rowTexts(table) {
  return within(table)
    .getAllByRole("row")
    .map((row) => within(row).queryAllByRole("cell"))
    .filter((cells) => cells.length)
    .map((cells) =>
      cells.map((cell) => cell.textContent.replace(/\s+/g, " ").trim()),
    );
}

describe("Плотная таблица складских предложений", () => {
  it("читает производителя, артикул и признак детали раздельно в строке предложения", async () => {
    const user = userEvent.setup();
    const table = await showOffers(user, goods);
    const [identity] = within(table).getAllByRole("cell");
    expect(identity).toHaveAccessibleName(
      "ASAM 01089 Искомая деталь Фильтр топливный",
    );
  });

  it("показывает одну деталь на нескольких складах независимыми строками с ценой и остатком склада", async () => {
    const part = {
      goodsID: "part-1",
      brand: "ASAM",
      number: "01089",
      name: "Фильтр топливный",
      // Устаревшая общая цена детали не должна попасть в строки складов.
      price: 999999,
      warehouses: [
        { id: "warehouse-1", code: "ДМД", price: 86.88, stock: 28 },
        { id: "warehouse-2", code: "РЕЗ", price: 120.5, stock: 0 },
      ],
    };
    const user = userEvent.setup();
    const table = await showOffers(user, [part]);
    const rows = rowTexts(table);
    expect(rows).toHaveLength(2);
    expect(rows.map((cells) => cells.slice(1))).toEqual([
      ["ДМД", "86,88 ₽", "28 шт."],
      ["РЕЗ", "120,50 ₽", "Нет в наличии"],
    ]);
    expect(rows.map((cells) => cells[0])).toEqual([
      "ASAM 01089 Искомая деталь Фильтр топливный",
      "ASAM 01089 Искомая деталь Фильтр топливный",
    ]);
    expect(table.textContent).not.toContain("999");
    expect(
      screen
        .getAllByRole("status")
        .some((node) => node.textContent === "Поиск завершён. Строк в таблице: 2."),
    ).toBe(true);
    expect(
      table.closest("[aria-live], [role='status'], [role='alert']"),
    ).toBeNull();
    await expectAccessible();
  });

  it("сохраняет строку детали без складских предложений без вымышленной цены", async () => {
    const part = {
      goodsID: "part-2",
      brand: "FEBI",
      number: "7160500039S",
      name: "Деталь без предложений",
      price: 4567,
      warehouses: [],
    };
    const user = userEvent.setup();
    const table = await showOffers(user, [part]);
    const rows = rowTexts(table);
    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toContain("FEBI");
    expect(rows[0][0]).toContain("7160500039S");
    expect(rows[0].slice(1)).toEqual(["Нет предложений", "—", "Нет в наличии"]);
    // Устаревшая цена детали не подставляется вместо отсутствующей цены склада.
    expect(table.textContent).not.toMatch(/4\s?567/);
    expect(
      screen
        .getAllByRole("status")
        .some((node) => node.textContent === "Поиск завершён. Строк в таблице: 1."),
    ).toBe(true);
  });

  it("различает искомую деталь и аналог в строках результата", async () => {
    const part = {
      goodsID: "original",
      brand: "ASAM",
      number: "01089",
      name: "Фильтр топливный",
      warehouses: [{ id: "w1", code: "ДМД", price: 86.88, stock: 28 }],
      analogues: [
        {
          goodsID: "analogue",
          brand: "FEBI",
          number: "A-1203",
          name: "Аналог фильтра",
          warehouses: [{ id: "w2", code: "РЕЗ", price: 120.5, stock: 4 }],
        },
      ],
    };
    const user = userEvent.setup();
    const table = await showOffers(user, [part]);
    const rows = rowTexts(table);
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toContain("ASAM");
    expect(rows[0][0]).toContain("Искомая деталь");
    expect(rows[0][0]).not.toContain("Аналог");
    expect(rows[1][0]).toContain("FEBI");
    expect(rows[1][0]).toContain("A-1203");
    expect(rows[1][0]).toContain("Аналог");
    expect(rows[1][0]).not.toContain("Искомая деталь");
    expect(rows[1].slice(1)).toEqual(["РЕЗ", "120,50 ₽", "4 шт."]);
  });

  it("показывает все складские строки результата без пагинации и группировки", async () => {
    const parts = Array.from({ length: 60 }, (_, index) => ({
      goodsID: `part-${index}`,
      brand: "ASAM",
      number: `01089-${index}`,
      name: `Фильтр топливный ${index}`,
      warehouses: [
        { id: `main-${index}`, code: "ДМД", price: 100 + index, stock: index },
        { id: `backup-${index}`, code: "РЕЗ", price: 200 + index, stock: 0 },
      ],
    }));
    const user = userEvent.setup();
    const table = await showOffers(user, parts);
    const rows = rowTexts(table);
    expect(rows).toHaveLength(120);
    expect(rows.filter((cells) => cells[1] === "ДМД")).toHaveLength(60);
    expect(rows.filter((cells) => cells[1] === "РЕЗ")).toHaveLength(60);
    expect(rows[0][0]).toContain("01089-0");
    expect(rows[1][0]).toContain("01089-0");
    expect(rows.at(-1)[0]).toContain("01089-59");
    expect(
      screen
        .getAllByRole("status")
        .some((node) => node.textContent === "Поиск завершён. Строк в таблице: 120."),
    ).toBe(true);
    expect(
      screen.queryByRole("button", { name: /ещё|следующ|показать/i }),
    ).not.toBeInTheDocument();
  });
});
