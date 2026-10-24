import { useId, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { activeFilterCount } from "../../model/filters";
import SortSelect from "./SortSelect";
import ActiveOfferFilters from "../filters/ActiveOfferFilters";
import OfferFiltersDialog from "../filters/OfferFiltersDialog";

export default function OffersHeader({ visibleCount, totalCount, heading, selection }) {
  const filters = useSelector((state) => state.search.filters);
  const count = activeFilterCount(filters);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const id = useId();
  return (
    <>
      <div className="offers-filter-summary" aria-hidden={open ? "true" : undefined}>
        <div className="offers-heading-toolbar">
          {heading}
          <button
            ref={triggerRef}
            type="button"
            className="open-offer-filters"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? id : undefined}
            onClick={() => setOpen(true)}
          >
            Настроить фильтры{count ? ` (${count})` : ""}
          </button>
        </div>
        <div className="offers-results-toolbar">
          <div className="offers-results-selection">
            {selection}
            <span className="result-count">
              {count ? `Показано ${visibleCount} из ${totalCount}` : `Строк: ${totalCount}`}
            </span>
          </div>
          <SortSelect />
        </div>
        <ActiveOfferFilters triggerRef={triggerRef} />
      </div>

      {open && (
        <OfferFiltersDialog
          id={id}
          visibleCount={visibleCount}
          totalCount={totalCount}
          hasFilters={count > 0}
          triggerRef={triggerRef}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
