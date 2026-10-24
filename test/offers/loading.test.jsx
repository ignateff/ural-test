// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, stubFetch } from "../support/app-test-helpers";

const original = {
  goodsID: "old",
  brand: "ASAM",
  number: "01089",
  name: "Предыдущая деталь",
  warehouses: [
    { code: "Старый склад", price: 100, stock: 2 },
    { code: "Пустой склад", price: 50, stock: 0 },
  ],
};
const next = {
  ...original,
  goodsID: "new",
  brand: "FEBI",
  name: "Новая деталь",
  warehouses: [{ code: "Новый склад", price: 200, stock: 4 }],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  history.replaceState(null, "", "/");
});

async function initialSearch() {
  const fetch = stubFetch({ goods: [original, next] }, { goods: [original] });
  const user = userEvent.setup();
  renderApp();
  await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "01089");
  await screen.findByRole("option", { name: "ASAM" });
  const selector = screen.getByRole("combobox", { name: "Производитель искомой детали" });
  await user.selectOptions(selector, "ASAM");
  const table = await screen.findByRole("table");
  return { user, selector, table, fetch };
}

it("сохраняет таблицу при смене производителя и заменяет строки после ответа", async () => {
  const { user, selector, table, fetch } = await initialSearch();
  let respond;
  fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        respond = resolve;
      }),
  );
  await user.selectOptions(selector, "FEBI");
  expect(table).toBeInTheDocument();
  expect(table).toHaveTextContent("Предыдущая деталь");
  expect(screen.getByRole("region", { name: "Детали и предложения" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  expect(table.closest("[inert]")).not.toBeNull();
  expect(document.body.style.overflow).toBe("hidden");
  await act(async () => respond({ ok: true, json: async () => ({ goods: [next] }) }));
  await screen.findByText("Новая деталь");
  expect(screen.getByRole("table")).toBe(table);
  expect(table).not.toHaveTextContent("Предыдущая деталь");
  expect(table.closest("[inert]")).toBeNull();
  expect(document.body.style.overflow).toBe("");
});

it("сохраняет строки при вводе нового артикула, затем заменяет их пустым ответом", async () => {
  const { user, table, fetch, selector } = await initialSearch();
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ goods: [next] }) });
  await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "1");
  expect(table).toBeInTheDocument();
  expect(table).toHaveTextContent("Предыдущая деталь");
  expect(table.closest("[inert]")).not.toBeNull();
  expect(document.body.style.overflow).toBe("hidden");
  await screen.findByRole("option", { name: "FEBI" });
  // Ожидание выбора производителя не запирает страницу.
  expect(document.body.style.overflow).toBe("");
  expect(table).toBeInTheDocument();
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ goods: [] }) });
  await user.selectOptions(selector, "FEBI");
  await screen.findByText("Для выбранного производителя предложения не найдены.", {
    selector: ".state",
  });
  expect(table).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");
});

it("при ошибке сохраняет старые строки, освобождает прокрутку и позволяет повторить запрос", async () => {
  const { user, table, fetch, selector } = await initialSearch();
  document.body.style.overflow = "auto";
  fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await user.selectOptions(selector, "FEBI");
  await screen.findByRole("alert");
  expect(table).toBeInTheDocument();
  expect(table).toHaveTextContent("Предыдущая деталь");
  expect(screen.getByText("Показаны предыдущие предложения.")).toBeVisible();
  expect(document.body.style.overflow).toBe("auto");
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ goods: [next] }) });
  await user.click(screen.getByRole("button", { name: "Повторить" }));
  await screen.findByText("Новая деталь");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(table.closest("[inert]")).toBeNull();
  expect(document.body.style.overflow).toBe("auto");
  document.body.style.overflow = "";
});

it("очистка артикула во время загрузки удаляет таблицу и освобождает прокрутку", async () => {
  const { user, table, fetch, selector } = await initialSearch();
  let respond;
  fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        respond = resolve;
      }),
  );
  await user.selectOptions(selector, "FEBI");
  expect(table).toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");
  await user.click(screen.getByRole("button", { name: "Очистить артикул" }));
  expect(table).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("");
  await act(async () => respond({ ok: true, json: async () => ({ goods: [next] }) }));
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.getByText("Сначала выберите производителя")).toBeVisible();
});

it("удерживает выбранные фильтры и строки до ответа, затем сбрасывает фильтры для нового подбора", async () => {
  const { user, table, fetch, selector } = await initialSearch();
  await user.click(screen.getByRole("button", { name: "Настроить фильтры" }));
  await user.selectOptions(screen.getByRole("combobox", { name: "Наличие" }), "in");
  await user.click(screen.getByRole("button", { name: "Закрыть фильтры" }));
  let respond;
  fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        respond = resolve;
      }),
  );
  await user.selectOptions(selector, "FEBI");
  expect(table).toHaveTextContent("Предыдущая деталь");
  expect(table).not.toHaveTextContent("Пустой склад");
  expect(screen.getByRole("button", { name: "Настроить фильтры (1)" })).toBeInTheDocument();
  await act(async () => respond({ ok: true, json: async () => ({ goods: [next] }) }));
  await screen.findByText("Новая деталь");
  expect(screen.getByRole("button", { name: "Настроить фильтры" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Настроить фильтры (1)" })).toBeNull();
});

it.each(["артикула", "производителя"])(
  "сбрасывает фильтры ссылки при смене %s до первого ответа с предложениями",
  async (change) => {
    history.replaceState(null, "", "/?stock=in&kind=analogue&priceFrom=999&sort=price&order=desc");
    let oldResponse;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        const brand = new URL(url).searchParams.get("brand");
        if (brand === "ASAM")
          return new Promise((resolve) => {
            oldResponse = resolve;
          });
        return { ok: true, json: async () => ({ goods: brand ? [next] : [original, next] }) };
      }),
    );
    const user = userEvent.setup();
    renderApp({ number: "01089", brand: "ASAM" });
    const selector = screen.getByRole("combobox", { name: "Производитель искомой детали" });
    if (change === "артикула") {
      await user.type(screen.getByRole("textbox", { name: "Артикул детали" }), "1");
    }
    await screen.findByRole("option", { name: "FEBI" });
    await user.selectOptions(selector, "FEBI");
    await screen.findByText("Новая деталь");
    expect(screen.getByRole("button", { name: "Настроить фильтры" })).toBeEnabled();
    expect(location.search).not.toMatch(/stock=|kind=|priceFrom=/);
    expect(location.search).toContain("sort=price&order=desc");
    await act(async () => oldResponse({ ok: true, json: async () => ({ goods: [original] }) }));
    expect(screen.getByRole("table")).not.toHaveTextContent("Предыдущая деталь");
  },
);
