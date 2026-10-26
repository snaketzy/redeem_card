import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CardFilters } from '@/types';

const initialState: CardFilters = {
  status: [],
  page: 1,
  pageSize: 20,
};

/** 卡密列表筛选条件放入 store，切换页面回来时保持筛选上下文 */
const cardFilterSlice = createSlice({
  name: 'cardFilter',
  initialState,
  reducers: {
    patchFilters(state, action: PayloadAction<Partial<CardFilters>>) {
      Object.assign(state, action.payload);
    },
    resetFilters() {
      return initialState;
    },
  },
});

export const { patchFilters, resetFilters } = cardFilterSlice.actions;
export default cardFilterSlice.reducer;
