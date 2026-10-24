import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { brandSelected, loadBrands, numberChanged } from "../../model/searchSlice";
import { NUMBER_MAX_LENGTH } from "../../model/urlState";
import ErrorMessage from "../feedback/ErrorMessage";
import Loader from "../feedback/Loader";
import StatusAnnouncer from "../feedback/StatusAnnouncer";

// Отступ закреплённых элементов учитывает только закреплённую панель поиска.
function measurePanel(panel) {
  if (!panel) return;
  document.documentElement.style.setProperty(
    "--search-height",
    `${getComputedStyle(panel).position === "sticky" ? panel.getBoundingClientRect().height : 0}px`,
  );
}

export default function SearchPanel() {
  const dispatch = useDispatch();
  const { number, brand, brands, brandsStatus, brandsError } = useSelector((state) => state.search);
  const [retryCount, setRetryCount] = useState(0);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  // Измеряем до первой отрисовки, чтобы закреплённые заголовки не отставали от панели
  // на кадр; ResizeObserver далее повторяет измерение при изменении размеров.
  useLayoutEffect(() => {
    measurePanel(panelRef.current);
    const panel = panelRef.current;
    const update = () => measurePanel(panel);
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  const query = number.trim();
  const noResultsMessage = `По артикулу «${query}» ничего не найдено. Проверьте номер детали.`;

  useEffect(() => {
    if (!query) return;
    let request;
    const timer = setTimeout(() => {
      request = dispatch(loadBrands(query));
    }, 500);
    return () => {
      clearTimeout(timer);
      request?.abort();
    };
  }, [number, query, dispatch, retryCount]);

  function clearNumber() {
    dispatch(numberChanged(""));
    inputRef.current?.focus();
  }

  return (
    <section
      ref={panelRef}
      className="search-panel"
      aria-labelledby="search-heading"
      aria-busy={brandsStatus === "loading"}
    >
      <h2 id="search-heading" className="visually-hidden">
        Подбор детали
      </h2>
      <div className="search-fields">
        <div>
          <label htmlFor="part-number" className="form-label">
            Артикул детали
          </label>
          <div className="article-input">
            <span className="article-input-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              ref={inputRef}
              id="part-number"
              name="part-number"
              className="form-control"
              placeholder="Например, 01089"
              maxLength={NUMBER_MAX_LENGTH}
              autoComplete="off"
              spellCheck="false"
              aria-describedby="search-help"
              value={number}
              onChange={(event) => dispatch(numberChanged(event.target.value))}
            />
            {number && (
              <button className="clear-button" onClick={clearNumber} aria-label="Очистить артикул">
                ×
              </button>
            )}
          </div>
          <p id="search-help" className="form-text">
            Поиск начнётся автоматически после ввода.
          </p>
        </div>
        <div>
          <label htmlFor="source-brand" className="form-label">
            Производитель искомой детали
          </label>
          <select
            id="source-brand"
            className="form-select"
            value={brand}
            aria-describedby={brand ? "selected-brand" : undefined}
            disabled={brandsStatus !== "success" || !brands.length}
            onChange={(event) => dispatch(brandSelected(event.target.value))}
          >
            <option value="" disabled>
              {brandsStatus === "loading"
                ? "Ищем производителей…"
                : brandsStatus === "error"
                  ? "Ошибка поиска"
                  : brandsStatus === "success" && !brands.length
                    ? "Производители не найдены"
                    : "Выберите производителя"}
            </option>
            {/* Производитель из ссылки сохраняется, даже если поставщик его сейчас
              не вернул: иначе отправленная ссылка теряла бы выбранную деталь. */}
            {brand && !brands.includes(brand) && <option value={brand}>{brand}</option>}
            {brands.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {brand && (
            <p id="selected-brand" className="form-text selected-brand">
              Выбран производитель: {brand}
            </p>
          )}
        </div>
      </div>
      {!query && (
        <p className="hint">
          Не знаете, с чего начать? Попробуйте{" "}
          <button className="example-button" onClick={() => dispatch(numberChanged("01089"))}>
            01089
          </button>{" "}
          или{" "}
          <button className="example-button" onClick={() => dispatch(numberChanged("7160500039S"))}>
            7160500039S
          </button>
        </p>
      )}
      {query && brandsStatus === "idle" && <p className="hint">Ожидаем окончания ввода…</p>}
      {brandsStatus === "loading" && <Loader>Ищем производителей…</Loader>}
      {brandsStatus === "error" && (
        <ErrorMessage message={brandsError} retry={() => setRetryCount((value) => value + 1)} />
      )}
      <StatusAnnouncer>
        {brandsStatus === "success"
          ? brands.length
            ? `Найдено производителей: ${brands.length}. Выберите производителя.`
            : noResultsMessage
          : ""}
      </StatusAnnouncer>
      {brandsStatus === "success" && !brands.length && <p className="state">{noResultsMessage}</p>}
    </section>
  );
}
