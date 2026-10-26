import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface ApiErrorBody {
  code: string;
  message: string;
  detail?: unknown;
}

/**
 * 全局 RTK Query 实例。
 * 所有业务接口都通过 enhanceEndpoints 注入，便于按域拆分文件。
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json');
      // MVP 无鉴权；接入统一登录后在这里注入 Authorization
      return headers;
    },
  }),
  tagTypes: ['Card', 'Batch', 'Log', 'Stats', 'Meta'],
  endpoints: () => ({}),
});

/** 从 RTK Query 的 error 中提取后端返回的中文错误信息 */
export function extractErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  const err = error as { status?: number | string; data?: unknown; message?: string };
  const data = err.data as ApiErrorBody | string | undefined;
  if (data && typeof data === 'object' && 'message' in data) return String(data.message);
  if (typeof data === 'string' && data.length < 300) return data;
  if (err.message) return err.message;
  return '请求失败，请稍后重试';
}
