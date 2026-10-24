import { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { filtersChanged, filtersReset } from "../store";

export default function ActiveOfferFilters({ triggerRef }) {
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.search.filters);
  const listRef = useRef(null);
  const tags = [
    ...(filters.stock
      ? [
          {
            key: "stock",
            text: filters.stock === "in" ? "В наличии" : "Нет в наличии",
            label: "Убрать фильтр наличия",
            patch: { stock: "" },
          },
        ]
      : []),
    ...(filters.wh || []).map((value) => ({
      key: `wh:${value}`,
      text: `Склад: ${value}`,
      label: `Удалить склад ${value}`,
      patch: { wh: filters.wh.filter((item) => item !== value) },
    })),
    ...(filters.brands || []).map((value) => ({
      key: `brands:${value}`,
      text: `Производитель: ${value}`,
      label: `Удалить производителя ${value}`,
      patch: { brands: filters.brands.filter((item) => item !== value) },
    })),
    ...(filters.kind
      ? [
          {
            key: "kind",
            text: filters.kind === "original" ? "Искомая деталь" : "Аналоги",
            label: "Убрать фильтр типа строки",
            patch: { kind: "" },
          },
        ]
      : []),
    ...(filters.priceFrom || filters.priceTo
      ? [
          {
            key: "price",
            text: `Цена: ${filters.priceFrom && filters.priceTo ? `${filters.priceFrom}–${filters.priceTo}` : filters.priceFrom ? `от ${filters.priceFrom}` : `до ${filters.priceTo}`} ₽`,
            label: "Убрать диапазон цены",
            patch: { priceFrom: "", priceTo: "" },
          },
        ]
      : []),
  ];
  if (!tags.length) return null;
  function remove(tag, index) {
    const buttons = listRef.current.querySelectorAll("button");
    (buttons[index + 1] || buttons[index - 1] || triggerRef.current).focus({ preventScroll: true });
    dispatch(filtersChanged(tag.patch));
  }
  return (
    <div className="active-offer-filters">
      <span className="active-offer-filters-label">Выбрано</span>
      <ul ref={listRef} aria-label="Выбранные фильтры">
        {tags.map((tag, index) => (
          <li key={tag.key}>
            <button type="button" aria-label={tag.label} onClick={() => remove(tag, index)}>
              {tag.text}
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="filter-reset"
        onClick={() => {
          triggerRef.current.focus({ preventScroll: true });
          dispatch(filtersReset());
        }}
      >
        Сбросить фильтры
      </button>
    </div>
  );
}
