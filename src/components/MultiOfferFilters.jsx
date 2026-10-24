import { availableFilterValues } from "../offerFilters";
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { filtersChanged } from '../store';

function CheckboxGroup({ label, values, selected, onChange }) {
  return <fieldset className="multi-offer-filter">
    <legend>{label}</legend>
    <div className="multi-offer-options">
      {values.map(value => <label key={value}>
        <input type="checkbox" checked={selected.includes(value)} onChange={event => onChange(event.target.checked ? [...selected, value] : selected.filter(item => item !== value))} />
        <span>{value}</span>
      </label>)}
    </div>
  </fieldset>;
}
export default function MultiOfferFilters() {
  const dispatch = useDispatch();
  const { offers, filters } = useSelector(state => state.search);
  const options = useMemo(() => availableFilterValues(offers), [offers]);
  return <>
    <CheckboxGroup label="Склад" values={options.wh} selected={filters.wh || []} onChange={wh => dispatch(filtersChanged({ wh }))} />
    <CheckboxGroup label="Производитель" values={options.brands} selected={filters.brands || []} onChange={brands => dispatch(filtersChanged({ brands }))} />
  </>;
}
