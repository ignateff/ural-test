import { configureStore } from "@reduxjs/toolkit";
import { initialState, searchReducer } from "../parts-search/model/searchSlice";
import {
  readSearchFromUrl,
  readSortFromUrl,
  readFiltersFromUrl,
} from "../parts-search/model/urlState";

// Подбор из адреса становится начальным состоянием: ссылку можно открыть заново.
// Фабрика нужна тестам, чтобы проверить это с адресом текущего окна; без DOM
// (Node-проверки) начальный подбор пуст.
export function createAppStore(searchFromUrl = readSearchFromUrl(globalThis.window?.location)) {
  return configureStore({
    reducer: { search: searchReducer },
    preloadedState: {
      search: {
        ...initialState,
        filters: readFiltersFromUrl(globalThis.window?.location),
        ...readSortFromUrl(globalThis.window?.location),
        ...searchFromUrl,
      },
    },
  });
}

export const store = createAppStore();
