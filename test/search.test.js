import { describe, expect, it, vi, afterEach } from "vitest";
import { getBrands, getOffers, searchParts } from "../src/api";
import { searchReducer, numberChanged, brandSelected, loadBrands, loadOffers } from "../src/store";

afterEach(() => vi.unstubAllGlobals());

describe("Ответ поставщика", () => {
  it("берёт цену и остаток каждого склада и включает вложенные аналоги", () => {
    const rows = getOffers([
      {
        goodsID: "a",
        brand: "FEBI",
        number: "1",
        price: 999,
        warehouses: [
          { id: "w1", price: 10, stock: 0 },
          { id: "w2", price: 20, stock: 4 },
        ],
        analogues: [{ goodsID: "b", brand: "MEYLE", number: "2", warehouses: [] }],
      },
    ]);
    expect(rows.map(({ price, stock, analogue }) => ({ price, stock, analogue }))).toEqual([
      { price: 10, stock: 0, analogue: false },
      { price: 20, stock: 4, analogue: false },
      { price: null, stock: 0, analogue: true },
    ]);
  });
  it("не дублирует бренды и складские предложения", () => {
    expect(getBrands([{ brand: "A" }, { brand: "A" }, { brand: "B" }])).toEqual(["A", "B"]);
    const part = {
      goodsID: "a",
      brand: "A",
      number: "1",
      warehouses: [{ id: "w", price: 0, stock: 1 }],
    };
    expect(getOffers([part, part])).toHaveLength(1);
  });
  it("считает пустую структуру отсутствием результата", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ goods: [{}] }) }),
    );
    expect(await searchParts({ number: "1" })).toEqual([]);
  });
  it("кодирует спецсимволы номера и бренда", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ goods: [] }) });
    vi.stubGlobal("fetch", fetch);
    await searchParts({ number: "#1 &2", brand: "Meat & Doria" });
    const url = new URL(fetch.mock.calls[0][0], "http://localhost");
    expect(url.searchParams.get("number")).toBe("#1 &2");
    expect(url.searchParams.get("brand")).toBe("Meat & Doria");
    expect(url.origin).toBe("https://api.favorit-parts.ru");
    expect(url.pathname).toBe("/hs/hsprice/");
    expect(url.searchParams.get("key")).toBeTruthy();
    expect(url.searchParams.get("analogues")).toBe("on");
  });
  it("показывает ошибку API и отклоняет неожиданный формат", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Лимит запросов" }),
      }),
    );
    await expect(searchParts({ number: "1" })).rejects.toThrow("Лимит запросов");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    await expect(searchParts({ number: "1" })).rejects.toThrow("формат");
  });
});

describe("Прямые запросы к API", () => {
  it("запрашивает бренды без параметров второго этапа", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ goods: [] }) });
    vi.stubGlobal("fetch", fetch);
    await searchParts({ number: "01089" });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.has("brand")).toBe(false);
    expect(url.searchParams.has("analogues")).toBe(false);
  });
  it("переводит ошибки поставщика даже при HTTP 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: "Invalid key client!" }),
      }),
    );
    await expect(searchParts({ number: "1" })).rejects.toThrow("Ключ доступа к API недействителен");
  });
  it("объясняет сетевую ошибку и превышение времени ожидания", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(searchParts({ number: "1" })).rejects.toThrow("Проверьте подключение");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
    await expect(searchParts({ number: "1" })).rejects.toThrow("20 секунд");
  });
  it("передаёт отмену запроса в fetch", async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockImplementation(async (_, { signal }) => {
      signal.throwIfAborted();
      return { ok: true, json: async () => ({ goods: [] }) };
    });
    vi.stubGlobal("fetch", fetch);
    controller.abort();
    await expect(searchParts({ number: "1", signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});

describe("Защита от устаревших запросов", () => {
  it("игнорирует бренды предыдущего артикула", () => {
    let state = searchReducer(undefined, loadBrands.pending("old", "1"));
    state = searchReducer(state, numberChanged("2"));
    state = searchReducer(state, loadBrands.pending("new", "2"));
    state = searchReducer(state, loadBrands.fulfilled(["STALE"], "old", "1"));
    expect(state.brands).toEqual([]);
    state = searchReducer(state, loadBrands.fulfilled(["CURRENT"], "new", "2"));
    expect(state.brands).toEqual(["CURRENT"]);
  });
  it("сбрасывает предложения при смене бренда и игнорирует старый ответ", () => {
    let state = searchReducer(undefined, brandSelected("A"));
    state = searchReducer(state, loadOffers.pending("old", { number: "1", brand: "A" }));
    state = searchReducer(state, brandSelected("B"));
    state = searchReducer(
      state,
      loadOffers.fulfilled([{ id: "old" }], "old", { number: "1", brand: "A" }),
    );
    expect(state.brand).toBe("B");
    expect(state.offers).toEqual([]);
    expect(state.offersStatus).toBe("idle");
  });
});
