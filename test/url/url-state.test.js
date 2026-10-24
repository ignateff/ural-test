import { describe, expect, it, vi } from "vitest";
import {
  buildSearchUrl,
  readSearchFromUrl,
  writeSearchToUrl,
} from "../../src/parts-search/model/urlState";

const at = (href) => new URL(href);

describe("Чтение подбора из адреса", () => {
  it("читает артикул и производителя и обрезает пробелы", () => {
    expect(readSearchFromUrl(at("https://app.test/?number=%2001089%20&brand=ASAM%20"))).toEqual({
      number: "01089",
      brand: "ASAM",
    });
  });

  it("декодирует кириллицу, пробелы и спецсимволы", () => {
    const url = at("https://app.test/?number=A%20B%261&brand=%D0%9C%D0%B5%D0%B9%D0%BB%D0%B5");
    expect(readSearchFromUrl(url)).toEqual({
      number: "A B&1",
      brand: "Мейле",
    });
  });

  it("игнорирует производителя без артикула", () => {
    expect(readSearchFromUrl(at("https://app.test/?brand=ASAM"))).toEqual({
      number: "",
      brand: "",
    });
  });

  it("ограничивает длину артикула длиной поля ввода", () => {
    const url = at(`https://app.test/?number=${"9".repeat(150)}`);
    expect(readSearchFromUrl(url).number).toHaveLength(100);
  });

  it("возвращает пустой подбор без адреса (серверный Node-контекст)", () => {
    expect(readSearchFromUrl(undefined)).toEqual({ number: "", brand: "" });
  });
});

describe("Сборка адреса подбора", () => {
  it("добавляет артикул и производителя, сохраняя прочие параметры и хэш", () => {
    expect(
      buildSearchUrl(
        { number: "01089", brand: "ASAM" },
        at("https://app.test/catalog?utm=mail#results"),
      ),
    ).toBe("/catalog?utm=mail&number=01089&brand=ASAM#results");
  });

  it("кодирует пробелы и кириллицу", () => {
    const href = buildSearchUrl({ number: "A B&1", brand: "Мейле" }, at("https://app.test/"));
    const params = new URL(`https://app.test${href}`).searchParams;
    expect(params.get("number")).toBe("A B&1");
    expect(params.get("brand")).toBe("Мейле");
  });

  it("удаляет параметры, когда значения пустые", () => {
    expect(
      buildSearchUrl(
        { number: "", brand: "" },
        at("https://app.test/?number=01089&brand=ASAM&utm=mail"),
      ),
    ).toBe("/?utm=mail");
  });
});

describe("Запись подбора в адрес", () => {
  it("заменяет адрес без добавления записи в историю, только при изменении", () => {
    // history.replaceState в браузере меняет location; повторяем это в заглушке.
    const location = at("https://app.test/?number=01089");
    const history = {
      state: { from: "test" },
      replaceState: vi.fn((state, _title, url) => {
        const next = new URL(url, location.href);
        location.href = next.href;
      }),
    };

    writeSearchToUrl({ number: "01089", brand: "ASAM" }, history, location);
    expect(history.replaceState).toHaveBeenCalledTimes(1);
    expect(history.replaceState).toHaveBeenCalledWith(
      { from: "test" },
      "",
      "/?number=01089&brand=ASAM",
    );

    history.replaceState.mockClear();
    writeSearchToUrl({ number: "01089", brand: "ASAM" }, history, location);
    expect(history.replaceState).not.toHaveBeenCalled();
  });

  it("ничего не делает без history/location", () => {
    expect(() => writeSearchToUrl({ number: "1" }, undefined, undefined)).not.toThrow();
  });
});
