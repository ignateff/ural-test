// Полный подбор остаётся неизменным; фильтры задают только его представление.
export const emptyFilters = { stock: '', wh: [], brands: [], kind: '', priceFrom: '', priceTo: '' };
export function normalizeStock(value) { return ['in', 'out'].includes(value) ? value : ''; }
export function normalizeKind(value) { return ['original', 'analogue'].includes(value) ? value : ''; }
export function normalizePrice(value) {
  const text = String(value ?? '').trim();
  return text && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Number.isFinite(Number(text)) ? text : '';
}
export function filterOffers(offers, filters) {
  return offers.filter(offer => (!filters.wh?.length || filters.wh.includes(offer.warehouse)) && (!filters.brands?.length || filters.brands.includes(offer.brand)) && (!filters.stock || (filters.stock === 'in' ? offer.stock > 0 : !(offer.stock > 0))) && (!filters.kind || (filters.kind === 'analogue' ? offer.analogue : !offer.analogue)) &&
    ((!filters.priceFrom && !filters.priceTo) || (typeof offer.price === 'number' && Number.isFinite(offer.price) &&
      (!filters.priceFrom || offer.price >= Number(filters.priceFrom)) && (!filters.priceTo || offer.price <= Number(filters.priceTo)))));
}
export function activeFilterCount(filters) {
  return Number(Boolean(filters.wh?.length)) + Number(Boolean(filters.brands?.length)) + Number(Boolean(filters.stock)) + Number(Boolean(filters.kind)) + Number(Boolean(filters.priceFrom || filters.priceTo));
}

export function availableFilterValues(offers) {
  return {
    wh: [...new Set(offers.filter(offer => offer.warehouse !== 'Нет предложений').map(offer => offer.warehouse))].sort((a, b) => a.localeCompare(b)),
    brands: [...new Set(offers.map(offer => offer.brand))].sort((a, b) => a.localeCompare(b)),
  };
}
