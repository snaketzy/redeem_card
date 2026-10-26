import { api } from './api';
import type {
  BatchWithStats,
  Card,
  CardFilters,
  CardListResponse,
  GenerateCardsPayload,
  GenerateCardsResponse,
  MetaResponse,
  OverviewStats,
  Paged,
  RedeemLog,
  RedeemPayload,
  RedeemResponse,
  VerifyResponse,
} from '@/types';

function toQueryString(filters: CardFilters): string {
  const params = new URLSearchParams();
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.benefitType) params.set('benefitType', filters.benefitType);
  if (filters.benefitPeriod) params.set('benefitPeriod', filters.benefitPeriod);
  if (filters.batchId) params.set('batchId', filters.batchId);
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.usedByUserAccount) params.set('usedByUserAccount', filters.usedByUserAccount);
  if (filters.createdFrom) params.set('createdFrom', filters.createdFrom);
  if (filters.createdTo) params.set('createdTo', filters.createdTo);
  if (filters.expiresBefore) params.set('expiresBefore', filters.expiresBefore);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 20));
  return params.toString();
}

export const cardApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMeta: build.query<MetaResponse, void>({
      query: () => '/meta',
      providesTags: ['Meta'],
    }),

    getOverview: build.query<OverviewStats, void>({
      query: () => '/stats/overview',
      providesTags: ['Stats'],
    }),

    listCards: build.query<CardListResponse, CardFilters>({
      query: (filters) => `/cards?${toQueryString(filters)}`,
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Card' as const, id })), { type: 'Card', id: 'LIST' }]
          : [{ type: 'Card', id: 'LIST' }],
    }),

    getCard: build.query<Card & { batchNo: string | null; batchName: string | null }, string>({
      query: (id) => `/cards/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Card', id }],
    }),

    generateCards: build.mutation<GenerateCardsResponse, GenerateCardsPayload>({
      query: (body) => ({ url: '/cards/generate', method: 'POST', body }),
      invalidatesTags: ['Stats', 'Batch', { type: 'Card', id: 'LIST' }],
    }),

    updateCardsStatus: build.mutation<{ changed: number; requested: number }, { ids: string[]; status: 0 | 1 | 2 }>({
      query: (body) => ({ url: '/cards/status', method: 'PATCH', body }),
      invalidatesTags: ['Stats', 'Batch', { type: 'Card', id: 'LIST' }],
    }),

    listBatches: build.query<Paged<BatchWithStats>, { page?: number; pageSize?: number; keyword?: string; benefitType?: string }>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params.keyword) search.set('keyword', params.keyword);
        if (params.benefitType) search.set('benefitType', params.benefitType);
        search.set('page', String(params.page ?? 1));
        search.set('pageSize', String(params.pageSize ?? 20));
        return `/batches?${search.toString()}`;
      },
      providesTags: ['Batch'],
    }),

    updateBatchStatus: build.mutation<{ changed: number }, { id: string; status: 0 | 2; includeUsed?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/batches/${id}/status`, method: 'POST', body }),
      invalidatesTags: ['Batch', 'Stats', { type: 'Card', id: 'LIST' }],
    }),

    listLogs: build.query<
      Paged<RedeemLog>,
      { page?: number; pageSize?: number; cardCode?: string; action?: string; success?: 'true' | 'false' }
    >({
      query: (params) => {
        const search = new URLSearchParams();
        if (params.cardCode) search.set('cardCode', params.cardCode);
        if (params.action) search.set('action', params.action);
        if (params.success) search.set('success', params.success);
        search.set('page', String(params.page ?? 1));
        search.set('pageSize', String(params.pageSize ?? 20));
        return `/logs?${search.toString()}`;
      },
      providesTags: ['Log'],
    }),

    verifyCard: build.mutation<VerifyResponse, { cardCode: string; account?: string }>({
      query: (body) => ({ url: '/redeem/verify', method: 'POST', body }),
      invalidatesTags: ['Log'],
    }),

    redeemCard: build.mutation<RedeemResponse, RedeemPayload>({
      query: (body) => ({ url: '/redeem', method: 'POST', body }),
      invalidatesTags: ['Log', 'Stats', 'Batch', { type: 'Card', id: 'LIST' }],
    }),

    resetDemoData: build.mutation<{ ok: boolean; batches: number; cards: number }, void>({
      query: () => ({ url: '/dev/reset', method: 'POST' }),
      invalidatesTags: ['Log', 'Stats', 'Batch', 'Card', 'Meta'],
    }),
  }),
});

export const {
  useGetMetaQuery,
  useGetOverviewQuery,
  useListCardsQuery,
  useGetCardQuery,
  useGenerateCardsMutation,
  useUpdateCardsStatusMutation,
  useListBatchesQuery,
  useUpdateBatchStatusMutation,
  useListLogsQuery,
  useVerifyCardMutation,
  useRedeemCardMutation,
  useResetDemoDataMutation,
} = cardApi;

/** 导出：走 POST 拿文件流，前端触发下载 */
export async function exportCards(body: {
  format: 'csv' | 'txt';
  filters?: CardFilters;
  ids?: string[];
}): Promise<void> {
  const response = await fetch('/api/cards/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? '导出失败');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const matched = /filename="?([^"]+)"?/.exec(disposition);
  const filename = matched?.[1] ?? `redeem-cards.${body.format}`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
