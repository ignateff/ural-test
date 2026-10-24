import { useDispatch, useSelector } from 'react-redux';
import { filtersChanged } from '../store';
export default function AvailabilityFilter() {
  const dispatch = useDispatch();
  const stock = useSelector(state => state.search.filters.stock);
  return <fieldset className="offer-filter-group">
    <legend>Наличие</legend>
    <select aria-label="Наличие" value={stock} onChange={event => dispatch(filtersChanged({ stock: event.target.value }))}>
      <option value="">Все</option>
      <option value="in">В наличии</option>
      <option value="out">Нет в наличии</option>
    </select>
  </fieldset>;
}
