import { useId, useLayoutEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { filtersChanged, filtersReset } from "../../model/searchSlice";

export default function ActiveOfferFilters({ triggerRef }) {
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.search.filters);
  const listRef = useRef(null);
  const toggleRef = useRef(null);
  const resetRef = useRef(null);
  const listId = useId();
  const pendingFocus = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [layout, setLayout] = useState({ count: Infinity, height: undefined, truncated: false });
  const tags = [];
  if (filters.stock)
    tags.push({
      key: "stock",
      text: filters.stock === "in" ? "В наличии" : "Нет в наличии",
      label: "Убрать фильтр наличия",
      patch: { stock: "" },
    });
  for (const value of filters.wh || [])
    tags.push({
      key: `wh:${value}`,
      text: value,
      group: value === filters.wh[0] ? "Склады" : null,
      label: `Удалить склад ${value}`,
      patch: { wh: filters.wh.filter((item) => item !== value) },
    });
  for (const value of filters.brands || [])
    tags.push({
      key: `brands:${value}`,
      text: value,
      group: value === filters.brands[0] ? "Производители" : null,
      label: `Удалить производителя ${value}`,
      patch: { brands: filters.brands.filter((item) => item !== value) },
    });
  if (filters.kind)
    tags.push({
      key: "kind",
      text: filters.kind === "original" ? "Искомая деталь" : "Аналоги",
      label: "Убрать фильтр типа строки",
      patch: { kind: "" },
    });
  if (filters.priceFrom || filters.priceTo) {
    let range = `до ${filters.priceTo}`;
    if (filters.priceFrom) range = `от ${filters.priceFrom}`;
    if (filters.priceFrom && filters.priceTo) range = `${filters.priceFrom}–${filters.priceTo}`;
    tags.push({
      key: "price",
      text: `Цена: ${range} ₽`,
      label: "Убрать диапазон цены",
      patch: { priceFrom: "", priceTo: "" },
    });
  }
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      if (pendingFocus.current !== null) {
        triggerRef.current.focus({ preventScroll: true });
        pendingFocus.current = null;
      }
      setExpanded(false);
      return;
    }
    function measure() {
      // Measure natural wrapping with single-line tags even while expanded.
      list.dataset.measuring = "true";
      const items = [...list.children];
      const rows = [...new Set(items.map((item) => item.offsetTop))];
      const count =
        rows.length > 2 ? items.findIndex((item) => item.offsetTop === rows[2]) : items.length;
      const last = items[count - 1];
      const height = last.offsetTop - items[0].offsetTop + last.offsetHeight;
      const truncated = [...list.querySelectorAll(".active-filter-value")].some(
        (value) => value.scrollWidth > value.clientWidth + 1,
      );
      delete list.dataset.measuring;
      if (!expanded && items.slice(count).some((item) => item.contains(document.activeElement))) {
        last.querySelector("button").focus({ preventScroll: true });
      }
      setLayout((previous) =>
        previous.count === count && previous.height === height && previous.truncated === truncated
          ? previous
          : { count, height, truncated },
      );
      if (count === items.length && !truncated) {
        if (toggleRef.current === document.activeElement)
          resetRef.current.focus({ preventScroll: true });
        setExpanded(false);
      }
      if (pendingFocus.current !== null) {
        const visibleCount = expanded ? items.length : count;
        const target =
          items[Math.min(pendingFocus.current, visibleCount - 1)]?.querySelector("button");
        (target || triggerRef.current).focus({ preventScroll: true });
        pendingFocus.current = null;
      }
    }
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [filters, expanded, triggerRef]);

  if (!tags.length) return null;
  const hiddenCount = Math.max(0, tags.length - layout.count);
  function remove(tag, index) {
    pendingFocus.current = index;
    dispatch(filtersChanged(tag.patch));
  }
  return (
    <div className="active-offer-filters">
      <ul
        id={listId}
        ref={listRef}
        aria-label="Выбранные фильтры"
        data-expanded={expanded}
        style={{ height: expanded ? undefined : layout.height }}
      >
        {tags.map((tag, index) => {
          const hidden = !expanded && index >= layout.count;
          return (
            <li key={tag.key} aria-hidden={hidden || undefined}>
              {tag.group && <span className="active-filter-group">{tag.group}</span>}
              <button
                type="button"
                aria-label={tag.label}
                title={tag.text}
                tabIndex={hidden ? -1 : undefined}
                onClick={() => remove(tag, index)}
              >
                <span className="active-filter-value">{tag.text}</span>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="active-filter-actions">
        {(hiddenCount > 0 || layout.truncated) && (
          <button
            type="button"
            ref={toggleRef}
            className="active-filter-toggle"
            aria-controls={listId}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Свернуть" : hiddenCount ? `Ещё ${hiddenCount}` : "Показать полностью"}
          </button>
        )}
        <button
          type="button"
          ref={resetRef}
          className="filter-reset"
          onClick={() => {
            triggerRef.current.focus({ preventScroll: true });
            dispatch(filtersReset());
          }}
        >
          Сбросить фильтры
        </button>
      </div>
    </div>
  );
}
