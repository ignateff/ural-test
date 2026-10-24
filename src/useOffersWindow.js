import { useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

// Окно относится к прокрутке документа; строки и спейсеры остаются в потоке
// таблицы, чтобы её полная высота удерживала закреплённые заголовки.
export default function useOffersWindow(offers) {
  const bodyRef = useRef(null);
  const [origin, setOrigin] = useState(0);
  const active = offers.length > 100;
  const virtualizer = useWindowVirtualizer({
    count: active ? offers.length : 0,
    estimateSize: () => window.innerWidth < 576 ? 240 : 75,
    getItemKey: index => offers[index].id,
    overscan: 8,
    measureElement: element => element.getBoundingClientRect().height + (parseFloat(getComputedStyle(element).marginBottom) || 0),
    scrollMargin: origin,
    initialRect: { width: window.innerWidth, height: window.innerHeight },
    initialOffset: 0,
  });
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || !active) return;
    let previousWidth, previousFont;
    const update = () => {
      const width = body.getBoundingClientRect().width;
      const font = getComputedStyle(document.documentElement).fontSize;
      setOrigin(body.getBoundingClientRect().top + window.scrollY);
      if (previousWidth !== width || previousFont !== font) {
        previousWidth = width; previousFont = font;
        virtualizer.measure();
      }
    };
    const observer = new ResizeObserver(update);
    // Изменения элементов выше списка меняют его начало, но не размеры строк.
    observer.observe(body.parentElement.closest('.results-panel'));
    observer.observe(document.documentElement);
    const mutation = new MutationObserver(update);
    mutation.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    window.addEventListener('resize', update);
    const fontsChanged = () => { virtualizer.measure(); update(); };
    document.fonts?.addEventListener('loadingdone', fontsChanged);
    update();
    return () => {
      observer.disconnect(); mutation.disconnect();
      window.removeEventListener('resize', update);
      document.fonts?.removeEventListener('loadingdone', fontsChanged);
    };
  }, [active, virtualizer]);
  useLayoutEffect(() => {
    if (!active) return;
    virtualizer.measure();
    const panel = bodyRef.current?.closest('.results-panel');
    const searchHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--search-height')) || 0;
    if (panel && panel.getBoundingClientRect().top < searchHeight) {
      virtualizer.scrollToOffset(Math.max(0, window.scrollY + panel.getBoundingClientRect().top - searchHeight), { behavior: 'auto' });
    }
  }, [offers, active, virtualizer]);
  const items = active ? virtualizer.getVirtualItems() : offers.map((offer, index) => ({ key: offer.id, index }));
  return {
    bodyRef,
    items,
    measure: active ? virtualizer.measureElement : undefined,
    before: active && items.length ? Math.max(0, items[0].start - origin) : 0,
    after: active && items.length ? Math.max(0, virtualizer.getTotalSize() - (items.at(-1).end - origin)) : 0,
  };
}
