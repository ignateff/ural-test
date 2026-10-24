const API_URL = "https://api.favorit-parts.ru/hs/hsprice/";
const API_KEY =
  import.meta.env.VITE_FAVORIT_API_KEY ||
  "00000000-0000-0000-0000-000000000001";
const API_ERRORS = {
  "Empty key!": "Не указан ключ доступа к API.",
  "Invalid key client!": "Ключ доступа к API недействителен.",
  "Empty number goods!": "Укажите артикул детали.",
  "Request quota exceeded!": "Превышен лимит запросов. Повторите поиск позже.",
};

export async function searchParts({ number, brand, signal }) {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({ key: API_KEY, number });
  if (brand) {
    url.searchParams.set("brand", brand);
    url.searchParams.set("analogues", "on");
  }

  let response;
  try {
    response = await fetch(url.toString(), {
      signal: AbortSignal.any(
        [signal, AbortSignal.timeout(20000)].filter(Boolean),
      ),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    if (error.name === "TimeoutError") {
      throw new Error("Поставщик не ответил за 20 секунд. Повторите поиск.");
    }
    throw new Error(
      "Не удалось связаться с поставщиком. Проверьте подключение и повторите поиск.",
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    if (error.name === "TimeoutError") {
      throw new Error("Поставщик не ответил за 20 секунд. Повторите поиск.");
    }
    throw new Error("Поставщик вернул некорректный ответ. Повторите поиск.");
  }
  if (data?.error) {
    const message = Object.entries(API_ERRORS)
      .filter(([code]) => String(data.error).includes(code))
      .map(([, text]) => text)
      .join(" ");
    throw new Error(message || String(data.error));
  }
  if (!response.ok) {
    throw new Error("Сервис поставщика временно недоступен. Повторите поиск.");
  }
  if (!Array.isArray(data?.goods)) {
    throw new Error("Неожиданный формат ответа поставщика.");
  }
  return data.goods.filter((item) => item && item.brand && item.number);
}

export function getBrands(goods) {
  return [...new Set(goods.map((item) => item.brand))].sort((a, b) =>
    a.localeCompare(b),
  );
}

// Каждая строка — предложение конкретного склада, а не устаревшая цена товара.
export function getOffers(goods) {
  const rows = new Map();
  function visit(items, analogue = false) {
    for (const item of items) {
      if (!item || !item.brand || !item.number) continue;
      const warehouses = Array.isArray(item.warehouses) ? item.warehouses : [];
      const offers = warehouses.length ? warehouses : [null];
      offers.forEach((warehouse, index) => {
        const id = `${item.goodsID || `${item.brand}:${item.number}`}:${warehouse?.id || index}`;
        const previous = rows.get(id);
        rows.set(id, {
          id,
          brand: item.brand,
          number: item.number,
          name: item.name || "Без наименования",
          warehouse:
            warehouse?.code ||
            (warehouse ? "Склад поставщика" : "Нет предложений"),
          price: warehouse?.price ?? null,
          stock: warehouse?.stock ?? 0,
          analogue: previous ? previous.analogue && analogue : analogue,
        });
      });
      if (Array.isArray(item.analogues)) visit(item.analogues, true);
    }
  }
  visit(goods);
  return [...rows.values()];
}
