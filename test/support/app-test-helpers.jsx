// Общие помощники интеграционных проверок интерфейса. Работает настоящий React,
// настоящий Redux и настоящее преобразование ответа; подменяются только ответы
// внешнего запроса через существующий fetch-seam.
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, vi } from "vitest";
import App from "../../src/app/App";
import { createAppStore } from "../../src/app/store";
import { searchReducer } from "../../src/parts-search/model/searchSlice";

// initialSearch позволяет смоделировать запуск с подбором, прочитанным из адреса
// (так же, как это делает store в src/app/store.js при загрузке приложения).
export function renderApp(initialSearch) {
  // Заголовок и язык ставит index.html; в JSDOM задаём их сами.
  document.documentElement.lang = "ru";
  document.title = "Подбор автозапчастей";
  // С подбором из адреса используем тот же путь создания store, что и приложение.
  const store = initialSearch
    ? createAppStore(initialSearch)
    : configureStore({ reducer: { search: searchReducer } });
  return render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
}

// Ответы отдаются по одному за вызов fetch — в порядке этапов подбора.
export function stubFetch(...responses) {
  const fetch = vi.fn();
  for (const data of responses) {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => data });
  }
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

export async function expectAccessible() {
  const results = await axe.run(document.documentElement, {
    // JSDOM не рассчитывает геометрию и отрисовку: контраст проверяют в браузере.
    rules: { "color-contrast": { enabled: false } },
  });
  expect(
    results.violations.map(({ id, nodes }) => ({
      id,
      elements: nodes.map(({ html, failureSummary }) => ({
        html,
        failureSummary,
      })),
    })),
  ).toEqual([]);
}

// Действия через тот же публичный интерфейс, что и у пользователя.
export async function openOfferFilters(user) {
  if (!screen.queryByRole("dialog", { name: "Фильтры" })) {
    await user.click(screen.getByRole("button", { name: /^Настроить фильтры/ }));
  }
}
export async function closeOfferFilters(user) {
  const close = screen.queryByRole("button", { name: "Закрыть фильтры" });
  if (close) await user.click(close);
}
