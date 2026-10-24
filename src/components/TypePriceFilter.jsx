import { useDispatch, useSelector } from 'react-redux';
import { normalizePrice } from '../offerFilters';
import { filtersChanged } from '../store';
export default function TypePriceFilter() {
  const dispatch = useDispatch();
  const { kind, priceFrom, priceTo } = useSelector(state => state.search.filters);
  return <><fieldset className="offer-filter-group">
    <legend>Тип строки</legend>
    <select aria-label="Тип строки" value={kind} onChange={event => dispatch(filtersChanged({ kind: event.target.value }))}>
      <option value="">Все</option>
      <option value="original">Искомая деталь</option>
      <option value="analogue">Аналоги</option>
    </select>
  </fieldset>
  <fieldset className="offer-filter-group price-filter">
    <legend>Цена</legend>
    <div className="price-filter-bounds">
      <label>От<input aria-label="Цена от" type="number" step="0.01" inputMode="decimal" value={priceFrom} onChange={event => dispatch(filtersChanged({ priceFrom: normalizePrice(event.target.value) }))} /></label>
      <label>До<input aria-label="Цена до" type="number" step="0.01" inputMode="decimal" value={priceTo} onChange={event => dispatch(filtersChanged({ priceTo: normalizePrice(event.target.value) }))} /></label>
    </div>
  </fieldset></>;
}
