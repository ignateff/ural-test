import useOffersWindow from "./useOffersWindow";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { sortChanged } from "../../model/searchSlice";
import { sortColumns, sortAnnouncement } from "../../model/sorting";
import StatusAnnouncer from "../feedback/StatusAnnouncer";
const rubles = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
});

export default function OffersTable({ offers }) {
  const dispatch = useDispatch();
  const windowed = useOffersWindow(offers);
  const { sort, order } = useSelector((state) => state.search);
  const [announcement, setAnnouncement] = useState("");
  function changeSort(nextSort, nextOrder) {
    dispatch(sortChanged({ sort: nextSort, order: nextOrder }));
    setAnnouncement(sortAnnouncement(nextSort, nextOrder));
  }
  return (
    <div className="offers-table">
      <StatusAnnouncer>{announcement}</StatusAnnouncer>
      <table className="table align-middle mb-0" aria-rowcount={offers.length + 1}>
        <caption className="visually-hidden">Найденные детали и предложения по складам</caption>
        <thead>
          <tr aria-rowindex={1}>
            {sortColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-label={column.label}
                className={["price", "stock"].includes(column.key) ? "text-end" : undefined}
                aria-sort={
                  sort === column.key ? (order === "asc" ? "ascending" : "descending") : "none"
                }
              >
                <button
                  type="button"
                  className="sort-heading"
                  aria-label={column.label}
                  onClick={() => {
                    const direction = sort !== column.key ? "asc" : order === "asc" ? "desc" : "";
                    changeSort(direction ? column.key : "", direction);
                  }}
                >
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={windowed.bodyRef}>
          {windowed.before > 0 && <Spacer height={windowed.before} />}
          {windowed.items.map(({ key, index }) => {
            const offer = offers[index];
            return (
              <tr key={key} data-index={index} ref={windowed.measure} aria-rowindex={index + 2}>
                <td>
                  <div className="part-identity">
                    <strong>{offer.brand}</strong>{" "}
                    <span className="part-number">{offer.number}</span>{" "}
                    <span className={`kind ${offer.analogue ? "" : "original"}`}>
                      {offer.analogue ? "Аналог" : "Искомая деталь"}
                    </span>
                  </div>{" "}
                  <div className="part-name">{offer.name}</div>
                </td>
                <td data-label="Склад" className="warehouse">
                  {offer.warehouse}
                </td>
                <td data-label="Цена" className="text-end price">
                  {typeof offer.price === "number" && Number.isFinite(offer.price)
                    ? rubles.format(offer.price)
                    : "—"}
                </td>
                <td data-label="Остаток" className="text-end">
                  <span className={offer.stock > 0 ? "stock" : "text-secondary"}>
                    {offer.stock > 0 ? `${offer.stock} шт.` : "Нет в наличии"}
                  </span>
                </td>
              </tr>
            );
          })}
          {windowed.after > 0 && <Spacer height={windowed.after} />}
        </tbody>
      </table>
    </div>
  );
}

function Spacer({ height }) {
  return (
    <tr className="offers-spacer" aria-hidden="true" role="presentation">
      <td role="presentation" colSpan={4} style={{ height }} />
    </tr>
  );
}
