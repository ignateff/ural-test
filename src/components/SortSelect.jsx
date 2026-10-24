import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import { sortChanged } from '../store';
import { sortColumns, sortAnnouncement } from '../offerSorting';
import StatusAnnouncer from './StatusAnnouncer';
export default function SortSelect() {
  const dispatch = useDispatch();
  const { sort, order } = useSelector(state => state.search);
  const [announcement, setAnnouncement] = useState('');
  function changeSort(sort, order) {
    dispatch(sortChanged({sort, order}));
    setAnnouncement(sortAnnouncement(sort, order));
  }
  return <>      <div className="mobile-sort">
        <label htmlFor="offers-sort">Сортировка</label>
        <select id="offers-sort" value={sort ? `${sort}:${order}` : ''} onChange={event => {
          const [key = '', direction = ''] = event.target.value.split(':');
          changeSort(key, direction);
        }}>
          <option value="">Порядок поставщика</option>
          {sortColumns.flatMap(column => ['asc', 'desc'].map(direction => (
            <option key={`${column.key}:${direction}`} value={`${column.key}:${direction}`}>{column.label}: {direction === 'asc' ? 'по возрастанию' : 'по убыванию'}</option>
          )))}
        </select>
      </div>
<StatusAnnouncer>{announcement}</StatusAnnouncer></>;
}
