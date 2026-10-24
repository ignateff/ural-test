export const sortColumns = [
  { key: 'brand', label: 'Деталь / производитель' },
  { key: 'warehouse', label: 'Склад' },
  { key: 'price', label: 'Цена' },
  { key: 'stock', label: 'Остаток' },
];

export function normalizeSort(sort, order) {
  return sortColumns.some(column => column.key === sort) && ['asc', 'desc'].includes(order)
    ? { sort, order } : { sort: '', order: '' };
}

export function sortOffers(offers, sort, order) {
  if (!sort) return offers;
  return [...offers].sort((a, b) => {
    if (sort === 'price') {
      const aPriced = typeof a.price === 'number' && Number.isFinite(a.price);
      const bPriced = typeof b.price === 'number' && Number.isFinite(b.price);
      if (!aPriced || !bPriced) return Number(bPriced) - Number(aPriced);
    }
    const comparison = sort === 'price' || sort === 'stock'
      ? a[sort] - b[sort] : a[sort].localeCompare(b[sort], 'ru');
    return order === 'asc' ? comparison : -comparison;
  });
}

export function sortAnnouncement(sort, order) {
  const label = sortColumns.find(column => column.key === sort)?.label;
  return sort ? `Сортировка: ${label}, ${order === 'asc' ? 'по возрастанию' : 'по убыванию'}.` : 'Сортировка: порядок поставщика.';
}
