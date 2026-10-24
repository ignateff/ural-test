import { describe, expect, it, vi, afterEach } from "vitest";
import { availableFilterValues } from "../../src/parts-search/model/filters";
import { getBrands, getOffers, searchParts } from "../../src/parts-search/api/favoritParts";
import {
  searchReducer,
  numberChanged,
  brandSelected,
  loadBrands,
  loadOffers,
} from "../../src/parts-search/model/searchSlice";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Ответ поставщика", () => {
  it("отличает склад с названием «Нет предложений» от детали без складов", () => {
    const offers = getOffers([
      {
        goodsID: "real",
        brand: "ASAM",
        number: "1",
        warehouses: [{ code: "Нет предложений", price: 10, stock: 1 }],
      },
      { goodsID: "absent", brand: "ASAM", number: "2", warehouses: [] },
    ]);
    expect(availableFilterValues(offers).wh).toEqual(["Нет предложений"]);
  });
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
  it("игнорирует старый ответ после смены производителя до первого подбора", () => {
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

describe("Ошибки и отмена незавершённого HTTP-запроса", () => {
  function pendingFetch() {
    const fetch = vi.fn(
      (_, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    );
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }

  it("отменяет уже начавшийся запрос по сигналу вызывающего кода", async () => {
    const fetch = pendingFetch();
    const controller = new AbortController();
    const result = searchParts({ number: "1", signal: controller.signal });
    const rejection = expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);
    controller.abort();
    await rejection;
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("подключает deadline 20 секунд к сигналу выполняющегося fetch", async () => {
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    const fetch = pendingFetch();
    const result = searchParts({ number: "1", signal: new AbortController().signal });
    const rejection = expect(result).rejects.toThrow("20 секунд");
    expect(timeout).toHaveBeenCalledWith(20000);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);
    deadline.abort(new DOMException("deadline", "TimeoutError"));
    await rejection;
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it.each([
    ["SyntaxError", "Поставщик вернул некорректный ответ"],
    ["TimeoutError", "20 секунд"],
    ["AbortError", null],
  ])("обрабатывает %s во время чтения тела ответа", async (name, message) => {
    const error =
      name === "SyntaxError" ? new SyntaxError("bad JSON") : new DOMException("body", name);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw error;
        },
      }),
    );
    const result = searchParts({ number: "1" });
    if (message) await expect(result).rejects.toThrow(message);
    else await expect(result).rejects.toBe(error);
  });

  it("объясняет HTTP-ошибку без сообщения поставщика", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ goods: [] }) }),
    );
    await expect(searchParts({ number: "1" })).rejects.toThrow(
      "Сервис поставщика временно недоступен",
    );
  });
});

describe("Поздняя ошибка устаревшего запроса", () => {
  it.each([
    [loadBrands, "brands", "1", "2", ["CURRENT"]],
    [
      loadOffers,
      "offers",
      { number: "1", brand: "A" },
      { number: "1", brand: "B" },
      [{ id: "current", brand: "B" }],
    ],
  ])(
    "сохраняет успешные данные %s после позднего rejected",
    (load, field, oldArg, newArg, data) => {
      let state = searchReducer(undefined, load.pending("old", oldArg));
      state = searchReducer(state, load.pending("new", newArg));
      state = searchReducer(state, load.fulfilled(data, "new", newArg));
      const successful = state;
      state = searchReducer(state, load.rejected(new Error("Старая ошибка"), "old", oldArg));
      expect(state[field]).toEqual(data);
      expect(state[`${field}Status`]).toBe("success");
      expect(state[`${field}Error`]).toBe("");
      expect(state).toEqual(successful);
    },
  );
});

describe("Приоритет искомой детали при повторе среди аналогов", () => {
  it.each([true, false])(
    "сохраняет одну строку искомой детали; сначала оригинал: %s",
    (originalFirst) => {
      const original = {
        goodsID: "same",
        brand: "ASAM",
        number: "1",
        warehouses: [{ id: "w", code: "А", price: 0, stock: 1 }],
      };
      const parent = { goodsID: "parent", brand: "FEBI", number: "2", analogues: [original] };
      const offers = getOffers(originalFirst ? [original, parent] : [parent, original]);
      expect(offers.filter((offer) => offer.id === "same:w")).toEqual([
        expect.objectContaining({ brand: "ASAM", price: 0, analogue: false }),
      ]);
    },
  );
});
