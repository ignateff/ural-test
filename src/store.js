import {
  configureStore,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import { getBrands, getOffers, searchParts } from "./api";

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
    numberChanged: (_, action) => ({ ...initialState, number: action.payload }),
    brandSelected(state, action) {
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
        state.offersStatus = "success";
      })
      .addCase(loadOffers.rejected, (state, action) => {
        if (state.offersRequestId !== action.meta.requestId) return;
        state.offersStatus = action.meta.aborted ? "idle" : "error";
        state.offersError = action.error.message;
      });
  },
});

export const { numberChanged, brandSelected } = slice.actions;
export const searchReducer = slice.reducer;
export const store = configureStore({ reducer: { search: searchReducer } });
