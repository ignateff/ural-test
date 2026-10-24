import { availableFilterValues } from '../offerFilters';
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { filtersChanged } from '../store';
import MultiFilterDropdown from './MultiFilterDropdown';

export default function MultiOfferFilters() {
  const dispatch = useDispatch();
  const { offers, filters } = useSelector(state => state.search);
  const options = useMemo(() => availableFilterValues(offers), [offers]);
  const [openGroup, setOpenGroup] = useState(null);
  return <>
    <MultiFilterDropdown label="Склад" emptyLabel="Все склады" searchLabel="Поиск складов" values={options.wh} selected={filters.wh || []} open={openGroup === 'wh'} onOpenChange={open => setOpenGroup(open ? 'wh' : null)} onChange={wh => dispatch(filtersChanged({ wh }))} />
    <MultiFilterDropdown label="Производитель" emptyLabel="Все производители" searchLabel="Поиск производителей" values={options.brands} selected={filters.brands || []} open={openGroup === 'brands'} onOpenChange={open => setOpenGroup(open ? 'brands' : null)} onChange={brands => dispatch(filtersChanged({ brands }))} />
  </>;
}
