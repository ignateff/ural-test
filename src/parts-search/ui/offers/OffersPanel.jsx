import { filterOffers, activeFilterCount } from "../../model/filters";
import OffersHeader from "./OffersHeader";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sortOffers } from "../../model/sorting";
import { loadOffers } from "../../model/searchSlice";
import ErrorMessage from "../feedback/ErrorMessage";
import Loader from "../feedback/Loader";
import OffersTable from "./OffersTable";
import StatusAnnouncer from "../feedback/StatusAnnouncer";

export default function OffersPanel() {
  const dispatch = useDispatch();
  const { number, brand, sort, order, filters, offers, offersStatus, offersError } = useSelector(
    (state) => state.search,
  );
  const filteredOffers = useMemo(() => filterOffers(offers, filters), [offers, filters]);
  const sortedOffers = useMemo(
    () => sortOffers(filteredOffers, sort, order),
    [filteredOffers, sort, order],
  );
  const hasFilters = activeFilterCount(filters) > 0;
  const [retryCount, setRetryCount] = useState(0);
  const query = number.trim();
  const resultsRef = useRef(null);
  const noResultsMessage = "Для выбранного производителя предложения не найдены.";
  useEffect(() => {
    const panel = resultsRef.current;
    const height =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--search-height")) ||
      0;
    if (panel.getBoundingClientRect().top < height) {
      window.scrollTo({
        top: window.scrollY + panel.getBoundingClientRect().top - height,
        behavior: "instant",
      });
    }
  }, [number, brand, filters, sort, order]);

  useEffect(() => {
    if (!brand || !query) return;
    const request = dispatch(loadOffers({ number: query, brand }));
    return () => request.abort();
  }, [query, brand, dispatch, retryCount]);

  const hasOffers = offersStatus === "success" && offers.length > 0;
  const heading = (
    <div className="section-heading">
      <span className={`step ${brand ? "" : "muted"}`} aria-hidden="true">
        02
      </span>
      <h2 id="results-heading">Детали и предложения</h2>
    </div>
  );
  const selection = brand && (
    <p className="selection">
      {brand} <span>/</span> {query}
    </p>
  );

  return (
    <section
      ref={resultsRef}
      className="results-panel"
      aria-labelledby="results-heading"
      aria-busy={offersStatus === "loading"}
    >
      {hasOffers ? (
        <OffersHeader
          visibleCount={filteredOffers.length}
          totalCount={offers.length}
          heading={heading}
          selection={selection}
        />
      ) : (
        <>
          {heading}
          {selection}
        </>
      )}
      {!brand && (
        <div className="empty-results">
          <div className="empty-symbol" aria-hidden="true">
            ↗
          </div>
          <h3>Сначала выберите производителя</h3>
          <p>Здесь появятся цены, остатки и аналоги детали.</p>
        </div>
      )}
      {offersStatus === "loading" && <Loader>Загружаем предложения и аналоги…</Loader>}
      {offersStatus === "error" && (
        <ErrorMessage message={offersError} retry={() => setRetryCount((value) => value + 1)} />
      )}
      <StatusAnnouncer>
        {offersStatus === "success"
          ? offers.length
            ? hasFilters
              ? `Показано ${filteredOffers.length} из ${offers.length}.`
              : `Поиск завершён. Строк в таблице: ${offers.length}.`
            : noResultsMessage
          : ""}
      </StatusAnnouncer>
      {offersStatus === "success" &&
        (offers.length ? (
          filteredOffers.length ? (
            <OffersTable offers={sortedOffers} />
          ) : (
            <p className="state">Ничего не найдено по выбранным фильтрам</p>
          )
        ) : (
          <p className="state">{noResultsMessage}</p>
        ))}
    </section>
  );
}
