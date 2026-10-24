const rubles = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
});

export default function OffersTable({ offers }) {
  return (
    <div className="offers-table">
      <table className="table align-middle mb-0">
        <caption className="visually-hidden">
          Найденные детали и предложения по складам
        </caption>
        <thead>
          <tr>
            <th scope="col">Деталь / производитель</th>
            <th scope="col">Склад</th>
            <th scope="col" className="text-end">
              Цена
            </th>
            <th scope="col" className="text-end">
              Остаток
            </th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.id}>
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
              <td data-label="Склад" className="warehouse">{offer.warehouse}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
