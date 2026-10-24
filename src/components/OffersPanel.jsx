import { filterOffers, activeFilterCount } from "../offerFilters";
import OffersFilters from "./OffersFilters";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sortOffers } from "../offerSorting";
import { loadOffers } from "../store";
import ErrorMessage from "./ErrorMessage";
import Loader from "./Loader";
import OffersTable from "./OffersTable";
import StatusAnnouncer from "./StatusAnnouncer";

export default function OffersPanel() {
  const dispatch = useDispatch();
  const { number, brand, sort, order, filters, offers, offersStatus, offersError } = useSelector(
    (state) => state.search,
  );
  const filteredOffers = useMemo(() => filterOffers(offers, filters), [offers, filters]);
  const sortedOffers = useMemo(() => sortOffers(filteredOffers, sort, order), [filteredOffers, sort, order]);
  const hasFilters = activeFilterCount(filters) > 0;
  const [retryCount, setRetryCount] = useState(0);
  const query = number.trim();
  const resultsRef = useRef(null);
  const noResultsMessage =
    "Для выбранного производителя предложения не найдены.";
  useEffect(() => {
    const panel = resultsRef.current;
    const height = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--search-height")) || 0;
    if (panel.getBoundingClientRect().top < height) {
      window.scrollTo({ top: window.scrollY + panel.getBoundingClientRect().top - height, behavior: "instant" });
    }
  }, [number, brand, filters, sort, order]);

  useEffect(() => {
    if (!brand || !query) return;
    const request = dispatch(loadOffers({ number: query, brand }));
    return () => request.abort();
  }, [query, brand, dispatch, retryCount]);

  return (
    <section
      ref={resultsRef}
      className="results-panel"
      aria-labelledby="results-heading"
      aria-busy={offersStatus === "loading"}
    >
      <div className="section-heading">
        <span className={`step ${brand ? "" : "muted"}`} aria-hidden="true">
          02
        </span>
        <h2 id="results-heading">Детали и предложения</h2>

      </div>
      {!brand && (
        <div className="empty-results">
          <div className="empty-symbol" aria-hidden="true">
            ↗
          </div>
          <h3>Сначала выберите производителя</h3>
          <p>Здесь появятся цены, остатки и аналоги детали.</p>
        </div>
      )}
      {brand && (
        <p className="selection">
          {brand} <span>/</span> {query}
        </p>
      )}
      {offersStatus === "loading" && (
        <Loader>Загружаем предложения и аналоги…</Loader>
      )}
      {offersStatus === "error" && (
        <ErrorMessage
          message={offersError}
          retry={() => setRetryCount((value) => value + 1)}
        />
      )}
      <StatusAnnouncer>
        {offersStatus === "success"
          ? offers.length
            ? hasFilters ? `Показано ${filteredOffers.length} из ${offers.length}.` : `Поиск завершён. Строк в таблице: ${offers.length}.`
            : noResultsMessage
          : ""}
      </StatusAnnouncer>
      {offersStatus === "success" &&
        (offers.length ? (
          <>
            <OffersFilters visibleCount={filteredOffers.length} totalCount={offers.length} />
            {filteredOffers.length ? <OffersTable offers={sortedOffers} /> : <p className="state">Ничего не найдено по выбранным фильтрам</p>}
          </>
        ) : (
          <p className="state">{noResultsMessage}</p>
        ))}
    </section>
  );
}
