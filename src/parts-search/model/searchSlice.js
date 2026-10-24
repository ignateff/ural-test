import { emptyFilters, availableFilterValues } from "./filters";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getBrands, getOffers, searchParts } from "../api/favoritParts";

export const loadBrands = createAsyncThunk("search/brands", async (number, { signal }) =>
  getBrands(await searchParts({ number, signal })),
);
export const loadOffers = createAsyncThunk("search/offers", async ({ number, brand }, { signal }) =>
  getOffers(await searchParts({ number, brand, signal })),
);

export const initialState = {
  filters: emptyFilters,
  sort: "",
  order: "",
  number: "",
  brand: "",
  brands: [],
  offers: [],
  offersFor: null,
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
    numberChanged: (state, action) => ({
      ...initialState,
      number: action.payload,
      sort: state.sort,
      order: state.order,
      ...(action.payload.trim() && {
        offers: state.offers,
        offersFor: state.offersFor,
        filters: state.offers.length ? state.filters : emptyFilters,
      }),
    }),
    filtersChanged(state, action) {
      Object.assign(state.filters, action.payload);
    },
    filtersReset(state) {
      state.filters = emptyFilters;
    },
    sortChanged(state, action) {
      state.sort = action.payload.sort;
      state.order = action.payload.order;
    },
    brandSelected(state, action) {
      if (!state.offers.length) state.filters = emptyFilters;
      state.brand = action.payload;
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
        const { number, brand } = action.meta.arg;
        if (
          state.offersFor &&
          (state.offersFor.number !== number || state.offersFor.brand !== brand)
        ) {
          state.filters = { ...emptyFilters };
        }
        state.offers = action.payload;
        state.offersFor = { number, brand };
        // Ссылку можно проверить лишь после успешной загрузки полного подбора.
        const available = availableFilterValues(action.payload);
        state.filters.wh = (state.filters.wh || []).filter((value) => available.wh.includes(value));
        state.filters.brands = (state.filters.brands || []).filter((value) =>
          available.brands.includes(value),
        );
        state.offersStatus = "success";
      })
      .addCase(loadOffers.rejected, (state, action) => {
        if (state.offersRequestId !== action.meta.requestId) return;
        state.offersStatus = action.meta.aborted ? "idle" : "error";
        state.offersError = action.error.message;
      });
  },
});

export const { numberChanged, brandSelected, sortChanged, filtersChanged, filtersReset } =
  slice.actions;
export const searchReducer = slice.reducer;
