import { useId, useLayoutEffect, useRef, useState } from "react";

export default function MultiFilterDropdown({
  label,
  emptyLabel,
  searchLabel,
  values,
  selected,
  open,
  onOpenChange,
  onChange,
}) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const summary = selected.length ? `Выбрано: ${selected.length}` : emptyLabel;
  return (
    <fieldset className="multi-offer-filter" ref={rootRef}>
      <legend>{label}</legend>
      <button
        ref={triggerRef}
        type="button"
        className="multi-filter-trigger"
        aria-label={`${label}: ${summary}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
      >
        <span>{summary}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <DropdownPanel
          id={id}
          label={label}
          searchLabel={searchLabel}
          values={values}
          selected={selected}
          onChange={onChange}
          rootRef={rootRef}
          triggerRef={triggerRef}
          close={(restoreFocus) => {
            if (restoreFocus) triggerRef.current.focus({ preventScroll: true });
            onOpenChange(false);
          }}
        />
      )}
    </fieldset>
  );
}

function DropdownPanel({
  id,
  label,
  searchLabel,
  values,
  selected,
  onChange,
  rootRef,
  triggerRef,
  close,
}) {
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ left: 8, top: 8, width: 280, maxHeight: 360 });
  useLayoutEffect(() => {
    const place = () => {
      const anchor = triggerRef.current.getBoundingClientRect();
      const width = Math.min(Math.max(anchor.width, 280), window.innerWidth - 16);
      const topEdge = 8;
      const below = Math.max(0, window.innerHeight - anchor.bottom - 12);
      const above = Math.max(0, anchor.top - topEdge - 4);
      const upwards = below < 200 && above > below;
      const sideHeight = upwards ? above : below;
      // На низком экране допускаем перекрытие поля, чтобы поиск и варианты
      // оставались доступны, а весь список — в пределах экрана.
      const maxHeight = Math.max(
        0,
        Math.min(360, sideHeight < 160 ? window.innerHeight - topEdge - 8 : sideHeight),
      );
      const preferredTop = upwards ? anchor.top - maxHeight - 4 : anchor.bottom + 4;
      const top = Math.max(topEdge, Math.min(preferredTop, window.innerHeight - maxHeight - 8));
      setPosition({
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)),
        top,
        width,
        maxHeight,
      });
    };
    const outside = (event) => {
      // При нажатии на подпись нативный dialog сначала получает фокус сам,
      // затем label переводит его на checkbox. Не закрываем список между ними.
      if (event.type === "focusin" && event.target === panelRef.current?.closest("dialog[open]"))
        return;
      if (!rootRef.current?.contains(event.target)) closeRef.current(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current(true);
      }
    };
    place();
    searchRef.current.focus({ preventScroll: true });
    const observer = new ResizeObserver(place);
    observer.observe(triggerRef.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [rootRef, triggerRef]);
  const visible = values.filter((value) =>
    value.toLocaleLowerCase("ru").includes(query.toLocaleLowerCase("ru")),
  );
  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label={`${label}: варианты`}
      className="multi-filter-popup"
      style={position}
    >
      <div className="multi-filter-search">
        <input
          ref={searchRef}
          type="search"
          aria-label={searchLabel}
          placeholder={searchLabel}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="multi-offer-options" role="group" aria-label={label}>
        {visible.map((value) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, value]
                    : selected.filter((item) => item !== value),
                )
              }
            />
            <span>{value}</span>
          </label>
        ))}
        {!visible.length && (
          <p className="multi-filter-empty" role="status">
            Варианты не найдены
          </p>
        )}
      </div>
      <button
        type="button"
        className="multi-filter-clear"
        disabled={!selected.length}
        onClick={() => {
          searchRef.current.focus({ preventScroll: true });
          onChange([]);
        }}
      >
        Очистить выбор
      </button>
    </div>
  );
}
