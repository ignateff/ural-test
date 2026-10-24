import { filterOffers, activeFilterCount } from "../../model/filters";
import OffersHeader from "./OffersHeader";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sortOffers } from "../../model/sorting";
import { loadOffers } from "../../model/searchSlice";
import ErrorMessage from "../feedback/ErrorMessage";
import Loader from "../feedback/Loader";
import OffersTable from "./OffersTable";
import StatusAnnouncer from "../feedback/StatusAnnouncer";

export default function OffersPanel() {
  const dispatch = useDispatch();
  const {
    number,
    brand,
    sort,
    order,
    filters,
    offers,
    offersFor,
    offersStatus,
    offersError,
    brandsStatus,
  } = useSelector((state) => state.search);
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
  const hasOffers = offers.length > 0;
  const isStale = hasOffers && offersStatus !== "success";
  const isUpdating =
    offersStatus === "loading" ||
    (isStale &&
      offersStatus === "idle" &&
      (Boolean(brand) || brandsStatus === "idle" || brandsStatus === "loading"));

  useLayoutEffect(() => {
    if (!hasOffers || !isUpdating) return;
    // Таблица виртуализирована относительно документа, а не отдельного скроллера.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [hasOffers, isUpdating]);

  // Единственное место, возвращающее начало списка под закреплённую панель
  // поиска: до отрисовки, чтобы не мигал сдвиг при смене фильтров и сортировки.
  useLayoutEffect(() => {
    if (offersStatus !== "success") return;
    const panel = resultsRef.current;
    const height =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--search-height")) ||
      0;
    const top = panel.getBoundingClientRect().top;
    if (top < height) {
      window.scrollTo({ top: window.scrollY + top - height, behavior: "instant" });
    }
  }, [offersStatus, filters, sort, order]);

  useEffect(() => {
    if (!brand || !query) return;
    const request = dispatch(loadOffers({ number: query, brand }));
    return () => request.abort();
  }, [query, brand, dispatch, retryCount]);

  const heading = (
    <div className="section-heading">
      <h2 id="results-heading">Детали и предложения</h2>
    </div>
  );
  const displayedSelection = hasOffers ? offersFor : { brand, number: query };
  const selection = displayedSelection.brand && (
    <p className="selection">
      {displayedSelection.brand} <span>/</span> {displayedSelection.number}
    </p>
  );

  return (
    <section
      ref={resultsRef}
      className="results-panel"
      aria-labelledby="results-heading"
      aria-busy={Boolean(isUpdating)}
    >
      {isUpdating && hasOffers && (
        <div className="offers-refresh-status">
          <Loader>Обновляем предложения… Показаны предыдущие данные.</Loader>
        </div>
      )}
      {isStale && !isUpdating && <p className="state">Показаны предыдущие предложения.</p>}
      {offersStatus === "error" && (
        <ErrorMessage message={offersError} retry={() => setRetryCount((value) => value + 1)} />
      )}
      <div
        className="offers-content"
        inert={isStale}
        data-loading={Boolean(isUpdating && hasOffers)}
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
        {!brand && !hasOffers && (
          <div className="empty-results">
            <div className="empty-symbol" aria-hidden="true">
              ↗
            </div>
            <h3>Сначала выберите производителя</h3>
            <p>Здесь появятся цены, остатки и аналоги детали.</p>
          </div>
        )}
        {offersStatus === "loading" && !hasOffers && (
          <Loader>Загружаем предложения и аналоги…</Loader>
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
        {(hasOffers || offersStatus === "success") &&
          (offers.length ? (
            filteredOffers.length ? (
              <OffersTable offers={sortedOffers} />
            ) : (
              <p className="state">Ничего не найдено по выбранным фильтрам</p>
            )
          ) : (
            <p className="state">{noResultsMessage}</p>
          ))}
      </div>
    </section>
  );
}
