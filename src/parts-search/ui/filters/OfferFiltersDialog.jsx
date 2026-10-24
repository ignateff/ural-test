import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { filtersReset } from "../../model/searchSlice";
import AvailabilityFilter from "./AvailabilityFilter";
import MultiOfferFilters from "./MultiOfferFilters";
import TypePriceFilter from "./TypePriceFilter";
import StatusAnnouncer from "../feedback/StatusAnnouncer";

export default function OfferFiltersDialog({
  id,
  visibleCount,
  totalCount,
  hasFilters,
  triggerRef,
  onClose,
}) {
  const dispatch = useDispatch();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
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
  }, [triggerRef]);

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
    <dialog
      ref={dialogRef}
      id={id}
      className="offer-filter-drawer"
      aria-labelledby={`${id}-title`}
      aria-modal="true"
      onKeyDown={containFocus}
      onCancel={onClose}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
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
          onClose();
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
          onClick={onClose}
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
        {hasFilters && (
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
          {`Подходящих предложений: ${visibleCount} из ${totalCount}.`}
        </StatusAnnouncer>
        <button type="button" onClick={onClose}>
          К предложениям ({visibleCount})
        </button>
      </footer>
    </dialog>
  );
}
