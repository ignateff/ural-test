// @vitest-environment jsdom
// Артикул и производитель искомой детали как состояние адреса: ссылка открывает
// тот же подбор, а ввод и смена производителя обновляют адрес без перезагрузки.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppStore } from "../../src/app/store";
import { readSearchFromUrl } from "../../src/parts-search/model/urlState";
import { renderApp, stubFetch } from "../support/app-test-helpers";

const goods = [
  {
    goodsID: "part-1",
    brand: "ASAM",
    number: "01089",
    name: "Фильтр топливный",
    warehouses: [{ id: "warehouse-1", code: "ДМД", price: 86.88, stock: 28 }],
  },
];

const brands = {
  goods: [
    { goodsID: "b1", brand: "ASAM", number: "01089" },
    { goodsID: "b2", brand: "FEBI", number: "01089" },
  ],
};

const currentParams = () => new URL(window.location.href).searchParams;

// Открывает приложение по адресу: адрес выставляется, подбор читается так же,
// как это делает singleton-store при загрузке страницы.
function renderFromUrl(search) {
  window.history.replaceState(null, "", search);
  return renderApp(readSearchFromUrl(window.location));
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("Адрес как состояние подбора", () => {
  it("восстанавливает артикул и производителя из ссылки и загружает предложения", async () => {
    // При старте с адресом предложения запрашиваются сразу, а производители − после паузы ввода.
    const fetch = stubFetch({ goods }, brands);
    renderFromUrl("/?number=01089&brand=ASAM");

    const input = screen.getByRole("textbox", { name: "Артикул детали" });
    expect(input).toHaveValue("01089");

    const selector = screen.getByRole("combobox", {
      name: "Производитель искомой детали",
    });
    await screen.findByRole("option", { name: "ASAM" });
    expect(selector).toHaveValue("ASAM");

    const table = await screen.findByRole("table", {
      name: "Найденные детали и предложения по складам",
    });
    expect(within(table).getByRole("cell", { name: "28 шт." })).toBeVisible();

    const offersUrl = new URL(fetch.mock.calls[0][0]);
    expect(offersUrl.searchParams.get("number")).toBe("01089");
    expect(offersUrl.searchParams.get("brand")).toBe("ASAM");
    expect(offersUrl.searchParams.get("analogues")).toBe("on");
  });

  it("записывает артикул в адрес при вводе и убирает параметры при очистке", async () => {
    stubFetch(brands);
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "01089");
    await waitFor(() => expect(currentParams().get("number")).toBe("01089"));

    await user.click(screen.getByRole("button", { name: "Очистить артикул" }));
    await waitFor(() => expect(currentParams().toString()).toBe(""));
  });

  it("записывает выбранного производителя и меняет его в адресе", async () => {
    const fetch = stubFetch(
      brands,
      { goods },
      { goods: goods.map((part) => ({ ...part, brand: "FEBI" })) },
    );
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "01089");
    await screen.findByRole("option", { name: "ASAM" });
    const selector = screen.getByRole("combobox", {
      name: "Производитель искомой детали",
    });
    await user.selectOptions(selector, "ASAM");
    await waitFor(() => {
      expect(currentParams().get("number")).toBe("01089");
      expect(currentParams().get("brand")).toBe("ASAM");
    });

    await screen.findByRole("table");
    await user.selectOptions(selector, "FEBI");
    await waitFor(() => {
      expect(currentParams().get("brand")).toBe("FEBI");
      expect(currentParams().get("number")).toBe("01089");
      expect(within(screen.getByRole("table")).getByText("FEBI")).toBeVisible();
    });
    const request = new URL(fetch.mock.calls.at(-1)[0]);
    expect(request.searchParams.get("brand")).toBe("FEBI");
    expect(request.searchParams.get("number")).toBe("01089");
  });

  it("кодирует пробелы и спецсимволы артикула в адресе", async () => {
    stubFetch({ goods: [] });
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "A B&1");
    await waitFor(() => expect(currentParams().get("number")).toBe("A B&1"));
  });

  it("игнорирует производителя в ссылке без артикула и убирает его из адреса", async () => {
    renderFromUrl("/?brand=ASAM");

    expect(screen.getByRole("textbox", { name: "Артикул детали" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Производитель искомой детали" })).toBeDisabled();
    await waitFor(() => expect(currentParams().toString()).toBe(""));
  });

  it("сохраняет производителя из ссылки, даже если его нет в найденном списке", async () => {
    // Предложения для выбранного из ссылки производителя запрашиваются сразу.
    const fetch = stubFetch({ goods: [] }, brands);
    const user = userEvent.setup();
    renderFromUrl("/?number=01089&brand=НЕИЗВЕСТНЫЙ");

    const input = screen.getByRole("textbox", { name: "Артикул детали" });
    expect(input).toHaveValue("01089");
    const selector = screen.getByRole("combobox", {
      name: "Производитель искомой детали",
    });

    // Поставщик вернул только ASAM и FEBI, но выбранный из ссылки бренд не теряется.
    await screen.findByRole("option", { name: "ASAM" });
    expect(selector).toHaveValue("НЕИЗВЕСТНЫЙ");
    expect(currentParams().get("number")).toBe("01089");
    expect(currentParams().get("brand")).toBe("НЕИЗВЕСТНЫЙ");
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get("brand")).toBe("НЕИЗВЕСТНЫЙ");

    // Пользователь может заменить бренд на найденный — адрес обновляется.
    await user.selectOptions(selector, "ASAM");
    await waitFor(() => expect(currentParams().get("brand")).toBe("ASAM"));
  });

  it("создаёт store с подбором из адреса (реальная точка входа приложения)", () => {
    window.history.replaceState(null, "", "/?number=01089&brand=ASAM");

    const store = createAppStore();

    expect(store.getState().search).toMatchObject({
      number: "01089",
      brand: "ASAM",
    });
  });
});
