import { useEffect, useId, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { filtersReset } from "../store";
import { activeFilterCount } from "../offerFilters";
import AvailabilityFilter from "./AvailabilityFilter";
import MultiOfferFilters from "./MultiOfferFilters";
import TypePriceFilter from "./TypePriceFilter";
import SortSelect from "./SortSelect";
import StatusAnnouncer from "./StatusAnnouncer";
import ActiveOfferFilters from "./ActiveOfferFilters";

export default function OffersFilters({ visibleCount, totalCount }) {
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.search.filters);
  const count = activeFilterCount(filters);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    closeRef.current.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);

  function containFocus(event) {
    if (event.key !== "Tab") return;
    const controls = [
      ...dialogRef.current.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
      ),
    ].filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (
      (event.shiftKey && document.activeElement === first) ||
      (!event.shiftKey && document.activeElement === last)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus({ preventScroll: true });
    }
  }

  return (
    <>
      <div className="offers-filter-summary" aria-hidden={open ? "true" : undefined}>
        <div className="offers-results-toolbar">
          <span className="result-count">
            {count ? `Показано ${visibleCount} из ${totalCount}` : `Строк: ${totalCount}`}
          </span>
          <div className="offers-results-actions">
            <button
              ref={triggerRef}
              type="button"
              className="open-offer-filters"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={id}
              onClick={() => setOpen(true)}
            >
              Настроить фильтры{count ? ` (${count})` : ""}
            </button>
            <SortSelect />
          </div>
        </div>
        <ActiveOfferFilters triggerRef={triggerRef} />
      </div>
      <dialog
        ref={dialogRef}
        id={id}
        className="offer-filter-drawer"
        aria-labelledby={`${id}-title`}
        aria-modal="true"
        onKeyDown={containFocus}
        onCancel={() => setOpen(false)}
        onClose={(event) => {
          if (!event.currentTarget.open) setOpen(false);
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            setOpen(false);
        }}
      >
        <header className="offer-filter-drawer-header">
          <div>
            <h3 id={`${id}-title`}>Фильтры</h3>
            <p>Изменения применяются сразу</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="close-offer-filters"
            aria-label="Закрыть фильтры"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </header>
        <div className="offer-filter-drawer-body">
          <div className="offers-filters" role="group" aria-label="Фильтры складских предложений">
            <AvailabilityFilter />
            <MultiOfferFilters />
            <TypePriceFilter />
          </div>
          {count > 0 && (
            <button
              type="button"
              className="filter-reset"
              onClick={() => {
                closeRef.current.focus({ preventScroll: true });
                dispatch(filtersReset());
              }}
            >
              Сбросить фильтры
            </button>
          )}
        </div>
        <footer className="offer-filter-drawer-footer">
          <StatusAnnouncer>
            {open ? `Подходящих предложений: ${visibleCount} из ${totalCount}.` : ""}
          </StatusAnnouncer>
          <button type="button" onClick={() => setOpen(false)}>
            К предложениям ({visibleCount})
          </button>
        </footer>
      </dialog>
    </>
  );
}
