import { useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

// Окно относится к прокрутке документа; строки и спейсеры остаются в потоке
// таблицы, чтобы её полная высота удерживала закреплённые заголовки.
export default function useOffersWindow(offers) {
  const bodyRef = useRef(null);
  const [origin, setOrigin] = useState(0);
  const active = offers.length > 100;
  const virtualizer = useWindowVirtualizer({
    count: active ? offers.length : 0,
    estimateSize: () => (window.innerWidth < 576 ? 240 : 75),
    getItemKey: (index) => offers[index].id,
    overscan: 8,
    measureElement: (element) =>
      element.getBoundingClientRect().height +
      (parseFloat(getComputedStyle(element).marginBottom) || 0),
    scrollMargin: origin,
    initialRect: { width: window.innerWidth, height: window.innerHeight },
    initialOffset: 0,
  });
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || !active) return;
    let width, font;
    const update = () => {
      const rect = body.getBoundingClientRect();
      const nextFont = getComputedStyle(document.documentElement).fontSize;
      const nextOrigin = rect.top + window.scrollY;
      setOrigin((current) => (current === nextOrigin ? current : nextOrigin));
      if (rect.width !== width || nextFont !== font) {
        width = rect.width;
        font = nextFont;
        virtualizer.measure();
      }
    };
    // Корень документа покрывает всё, от чего зависят ширина строк и начало
    // списка: саму ширину (ресайз окна, появление скроллбара) и высоту контента
    // (элементы выше таблицы подвинулись). Высоты отрисованных строк и видимый
    // диапазон при ресайзе библиотека пересчитывает сама.
    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    const fontsChanged = () => {
      width = font = undefined;
      update();
    };
    document.fonts?.addEventListener("loadingdone", fontsChanged);
    update();
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", fontsChanged);
    };
  }, [active, virtualizer]);
  const measuredOffers = useRef(offers);
  useLayoutEffect(() => {
    if (!active || measuredOffers.current === offers) return;
    measuredOffers.current = offers;
    // Новый набор предложений может изменить высоты строк: сбрасываем кэш
    // измерений, чтобы спейсеры считались от актуальных оценок. Начало списка
    // под закреплённой панелью восстанавливает OffersPanel.
    virtualizer.measure();
  }, [offers, active, virtualizer]);
  const items = active
    ? virtualizer.getVirtualItems()
    : offers.map((offer, index) => ({ key: offer.id, index }));
  return {
    bodyRef,
    items,
    measure: active ? virtualizer.measureElement : undefined,
    before: active && items.length ? Math.max(0, items[0].start - origin) : 0,
    after:
      active && items.length
        ? Math.max(0, virtualizer.getTotalSize() - (items.at(-1).end - origin))
        : 0,
  };
}
