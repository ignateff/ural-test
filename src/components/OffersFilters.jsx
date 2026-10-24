import { useEffect, useState } from "react";
import SortSelect from "./SortSelect";
import TypePriceFilter from "./TypePriceFilter";
import { useDispatch, useSelector } from 'react-redux';
import { filtersReset } from '../store';
import { activeFilterCount } from '../offerFilters';
import MultiOfferFilters from './MultiOfferFilters';
import AvailabilityFilter from './AvailabilityFilter';
export default function OffersFilters({ showReset = true }) {
  const dispatch = useDispatch();
  const filters = useSelector(state => state.search.filters);
  const [mobile, setMobile] = useState(() => window.innerWidth <= 575);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const resize = () => setMobile(window.innerWidth <= 575);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const count = activeFilterCount(filters);
  return <>
    <div className="offers-toolbar">
      {mobile && <button type="button" className="filter-toggle" aria-expanded={expanded} aria-controls="offers-filter-panel" onClick={() => setExpanded(value => !value)}>Фильтры{count ? ` (${count})` : ''}</button>}
      <SortSelect />
    </div>
    <div id="offers-filter-panel" hidden={mobile && !expanded} className="offers-filters" role="group" aria-label="Фильтры складских предложений">
    <AvailabilityFilter />
    <MultiOfferFilters />
    <TypePriceFilter />
    {showReset && activeFilterCount(filters) > 0 && <button type="button" className="filter-reset" onClick={() => dispatch(filtersReset())}>Сбросить фильтры</button>}
  </div></>;
}
