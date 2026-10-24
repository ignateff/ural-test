import { normalizeStock, normalizeKind, normalizePrice } from "./filters";
import { normalizeSort } from "./sorting";
// Адрес страницы как источник и хранилище текущего подбора: артикул и
// производитель искомой детали переживают перезагрузку и попадают в ссылку.
// Значения читаются при создании Redux store и записываются при каждом изменении
// подбора; замена адреса не создаёт новых записей в истории браузера.
export const NUMBER_MAX_LENGTH = 100; // совпадает с maxLength поля артикула
const BRAND_MAX_LENGTH = 200; // санитарный предел длины ссылки для имени поставщика

const EMPTY_SEARCH = { number: "", brand: "" };

// Обрезает пробелы и ограничивает длину: значения приходят из адреса, который
// пользователь может изменить вручную.
function sanitize(value, maxLength) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

// Производитель без артикула не образует подбор: по одному бренду поставщик
// не ищет, поэтому такое значение из ссылки отбрасывается.
function normalizeSearch({ number, brand } = {}) {
  const nextNumber = sanitize(number, NUMBER_MAX_LENGTH);
  const nextBrand = nextNumber ? sanitize(brand, BRAND_MAX_LENGTH) : "";
  return { number: nextNumber, brand: nextBrand };
}

export function readSearchFromUrl(location) {
  if (!location) return EMPTY_SEARCH;
  const params = new URL(location.href).searchParams;
  return normalizeSearch({
    number: params.get("number"),
    brand: params.get("brand"),
  });
}

export function readSortFromUrl(location) {
  const params = location ? new URL(location.href).searchParams : new URLSearchParams();
  return normalizeSort(params.get("sort"), params.get("order"));
}

export function readFiltersFromUrl(location) {
  const params = location ? new URL(location.href).searchParams : new URLSearchParams();
  return {
    wh: [...new Set(params.getAll("wh"))],
    brands: [...new Set(params.getAll("brands"))],
    stock: normalizeStock(params.get("stock")),
    kind: normalizeKind(params.get("kind")),
    priceFrom: normalizePrice(params.get("priceFrom")),
    priceTo: normalizePrice(params.get("priceTo")),
  };
}

export function buildSearchUrl({ number, brand, sort, order, filters } = {}, location) {
  const normalized = normalizeSearch({ number, brand });
  const url = new URL(location.href);
  if (normalized.number) url.searchParams.set("number", normalized.number);
  else url.searchParams.delete("number");
  if (normalized.brand) url.searchParams.set("brand", normalized.brand);
  else url.searchParams.delete("brand");
  const sorting = normalizeSort(sort, order);
  for (const key of ["sort", "order"]) {
    if (sorting[key]) url.searchParams.set(key, sorting[key]);
    else url.searchParams.delete(key);
  }
  const stock = normalizeStock(filters?.stock);
  if (stock) url.searchParams.set("stock", stock);
  else url.searchParams.delete("stock");
  const kind = normalizeKind(filters?.kind);
  if (kind) url.searchParams.set("kind", kind);
  else url.searchParams.delete("kind");
  for (const key of ["priceFrom", "priceTo"]) {
    const price = normalizePrice(filters?.[key]);
    if (price) url.searchParams.set(key, price);
    else url.searchParams.delete(key);
  }
  for (const key of ["wh", "brands"]) {
    url.searchParams.delete(key);
    for (const value of filters?.[key] || []) url.searchParams.append(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function writeSearchToUrl(search, history, location) {
  if (!history || !location) return;
  const nextUrl = buildSearchUrl(search, location);
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  if (nextUrl === currentUrl) return;
  try {
    history.replaceState(history.state, "", nextUrl);
  } catch {
    // Браузер может ограничивать частоту замены адреса; подбор не должен из-за
    // этого ломаться — адрес обновится при следующем изменении.
  }
}
