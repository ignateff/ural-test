// Общие помощники интеграционных проверок интерфейса. Работает настоящий React,
// настоящий Redux и настоящее преобразование ответа; подменяются только ответы
// внешнего запроса через существующий fetch-seam.
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, vi } from "vitest";
import App from "../src/App";
import { searchReducer } from "../src/store";

export function renderApp() {
  // Заголовок и язык ставит index.html; в JSDOM задаём их сами.
  document.documentElement.lang = "ru";
  document.title = "Подбор автозапчастей";
  const store = configureStore({ reducer: { search: searchReducer } });
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
