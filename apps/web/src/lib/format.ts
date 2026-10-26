export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 把 ISO 时间转成 <input type="date"> / <input type="datetime-local"> 需要的本地格式 */
export function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDateTimeInputValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

/** 剩余天数，负数表示已过期 */
export function daysLeft(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * 按自然周期推算权益期截止日：从 from 起 N 个自然月后的前一日。
 * 例：2026-10-26 起 1 个月 → 2026-11-25；3 个月 → 2027-01-25；12 个月 → 2027-10-25。
 */
export function periodEndDate(months: number, from: Date = new Date()): string {
  // 先落到目标月 1 号，避免月末溢出（如 1/31 + 1 个月）
  const target = new Date(from.getFullYear(), from.getMonth() + months, 1);
  const lastDayOfMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(from.getDate(), lastDayOfMonth) - 1);
  return toDateInputValue(target.toISOString());
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0';
  return value.toLocaleString('zh-CN');
}

export function percent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
