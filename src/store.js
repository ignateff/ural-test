import { emptyFilters, availableFilterValues } from "./offerFilters";
import {
  configureStore,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import { getBrands, getOffers, searchParts } from "./api";
import { readSearchFromUrl, readSortFromUrl, readFiltersFromUrl } from "./urlState";

export const loadBrands = createAsyncThunk(
  "search/brands",
  async (number, { signal }) =>
    getBrands(await searchParts({ number, signal })),
);
export const loadOffers = createAsyncThunk(
  "search/offers",
  async ({ number, brand }, { signal }) =>
    getOffers(await searchParts({ number, brand, signal })),
);

const initialState = {
  filters: emptyFilters,
  sort: "",
  order: "",
  number: "",
  brand: "",
  brands: [],
  offers: [],
  brandsStatus: "idle",
  offersStatus: "idle",
  brandsError: "",
  offersError: "",
  brandsRequestId: null,
  offersRequestId: null,
};

const slice = createSlice({
  name: "search",
  initialState,
  reducers: {
    numberChanged: (state, action) => ({ ...initialState, number: action.payload, sort: state.sort, order: state.order }),
    filtersChanged(state, action) {
      Object.assign(state.filters, action.payload);
    },
    filtersReset(state) { state.filters = emptyFilters; },
    sortChanged(state, action) {
      state.sort = action.payload.sort;
      state.order = action.payload.order;
    },
    brandSelected(state, action) {
      state.filters = emptyFilters;
      state.brand = action.payload;
      state.offers = [];
      state.offersStatus = "idle";
      state.offersError = "";
      state.offersRequestId = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loadBrands.pending, (state, action) => {
        state.brandsStatus = "loading";
        state.brandsError = "";
        state.brandsRequestId = action.meta.requestId;
      })
      .addCase(loadBrands.fulfilled, (state, action) => {
        if (state.brandsRequestId !== action.meta.requestId) return;
        state.brands = action.payload;
        state.brandsStatus = "success";
      })
      .addCase(loadBrands.rejected, (state, action) => {
        if (state.brandsRequestId !== action.meta.requestId) return;
        state.brandsStatus = action.meta.aborted ? "idle" : "error";
        state.brandsError = action.error.message;
      })
      .addCase(loadOffers.pending, (state, action) => {
        state.offersStatus = "loading";
        state.offersError = "";
        state.offersRequestId = action.meta.requestId;
      })
      .addCase(loadOffers.fulfilled, (state, action) => {
        if (state.offersRequestId !== action.meta.requestId) return;
        state.offers = action.payload;
        // Ссылку можно проверить лишь после успешной загрузки полного подбора.
        const available = availableFilterValues(action.payload);
        state.filters.wh = (state.filters.wh || []).filter(value => available.wh.includes(value));
        state.filters.brands = (state.filters.brands || []).filter(value => available.brands.includes(value));
        state.offersStatus = "success";
      })
      .addCase(loadOffers.rejected, (state, action) => {
        if (state.offersRequestId !== action.meta.requestId) return;
        state.offersStatus = action.meta.aborted ? "idle" : "error";
        state.offersError = action.error.message;
      });
  },
});

export const { numberChanged, brandSelected, sortChanged, filtersChanged, filtersReset } = slice.actions;
export const searchReducer = slice.reducer;

// Подбор из адреса становится начальным состоянием: ссылку можно открыть заново.
// Фабрика нужна тестам, чтобы проверить это с адресом текущего окна; без DOM
// (Node-проверки) начальный подбор пуст.
export function createAppStore(
  searchFromUrl = readSearchFromUrl(globalThis.window?.location),
) {
  return configureStore({
    reducer: { search: searchReducer },
    preloadedState: {
      search: { ...initialState, filters: readFiltersFromUrl(globalThis.window?.location), ...readSortFromUrl(globalThis.window?.location), ...searchFromUrl },
    },
  });
}

export const store = createAppStore();
