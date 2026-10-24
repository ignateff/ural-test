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
  return String(value ?? "").trim().slice(0, maxLength);
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

export function buildSearchUrl({ number, brand } = {}, location) {
  const normalized = normalizeSearch({ number, brand });
  const url = new URL(location.href);
  if (normalized.number) url.searchParams.set("number", normalized.number);
  else url.searchParams.delete("number");
  if (normalized.brand) url.searchParams.set("brand", normalized.brand);
  else url.searchParams.delete("brand");
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
