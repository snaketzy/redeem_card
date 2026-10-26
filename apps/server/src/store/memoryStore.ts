import { randomUUID } from 'node:crypto';
import {
  BENEFIT_PERIODS,
  BENEFIT_TYPES,
  CARD_STATUS,
  CARD_STATUS_VALUES,
  type Batch,
  type BenefitPeriod,
  type BenefitType,
  type Card,
  type CardMember,
  type CardStatus,
  type LogAction,
  type Paged,
  type RedeemLog,
} from '../domain/types.js';
import { formatCardCode } from '../lib/cardCode.js';
import { createId } from '../lib/id.js';

/**
 * 数据访问层（当前为内存 Mock 实现）。
 *
 * ⚠️ 后续接入 MySQL 时，只需用 Prisma 实现同一个 DataStore 接口，
 * 然后把 store/index.ts 的导出换成 PrismaStore 即可，路由层无需改动。
 * 表结构对应见 DataStore 各方法（batches / cards / card_members / redeem_logs）。
 */

export interface CardQuery {
  status?: CardStatus[];
  benefitType?: BenefitType;
  benefitPeriod?: BenefitPeriod;
  batchId?: string;
  /** 模糊匹配：卡密 / 使用者账号 / 使用者 ID / 批次号 */
  keyword?: string;
  usedByUserAccount?: string;
  createdFrom?: string;
  createdTo?: string;
  expiresBefore?: string;
  page: number;
  pageSize: number;
}

export interface LogQuery {
  cardCode?: string;
  action?: LogAction;
  success?: boolean;
  page: number;
  pageSize: number;
}

export interface CreateBatchInput {
  name: string;
  batchNo: string;
  benefitType: BenefitType;
  benefitPeriod: BenefitPeriod;
  quantity: number;
  groupSize: number;
  validityDays: number | null;
  expiresAt: string | null;
  remark: string | null;
  createdBy: string;
}

export interface BatchStats {
  total: number;
  unused: number;
  used: number;
  frozen: number;
  usedRate: number;
}

export interface BatchWithStats extends Batch {
  stats: BatchStats;
}

export interface OverviewStats {
  total: number;
  byStatus: Record<CardStatus, number>;
  byBenefitType: Record<BenefitType, number>;
  byBenefitPeriod: Record<BenefitPeriod, number>;
  batchCount: number;
  /** 已使用占比（0-100，保留一位小数） */
  usedRate: number;
  /** 家庭卡已占用名额 / 总名额 */
  familySeats: { used: number; total: number };
  /** 7 天内到期且未使用的卡数 */
  expiringIn7Days: number;
  /** 近 7 天每日成功核销数，按日期升序 */
  redeemTrend: { date: string; count: number }[];
  /** 最近 5 条核销记录 */
  recentRedemptions: RedeemLog[];
}

export interface DataStore {
  createBatch(input: CreateBatchInput): Batch;
  getBatch(id: string): Batch | undefined;
  listBatches(query: { keyword?: string; benefitType?: BenefitType; page: number; pageSize: number }): Paged<BatchWithStats>;
  batchStats(batchId: string): BatchStats;

  insertCards(cards: Card[]): void;
  getCardById(id: string): Card | undefined;
  getCardByCode(code: string): Card | undefined;
  hasCode(code: string): boolean;
  listCards(query: CardQuery): Paged<Card>;
  updateCardStatus(ids: string[], status: CardStatus, onlyFrom?: CardStatus[]): number;
  updateCardsByBatch(batchId: string, status: CardStatus, onlyFrom?: CardStatus[]): number;
  saveCard(card: Card): void;

  addLog(log: Omit<RedeemLog, 'id' | 'createdAt'>): RedeemLog;
  listLogs(query: LogQuery): Paged<RedeemLog>;

  overview(): OverviewStats;
  reset(): void;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class MemoryStore implements DataStore {
  private cards = new Map<string, Card>();
  private codeIndex = new Map<string, string>();
  private batches = new Map<string, Batch>();
  private logs: RedeemLog[] = [];

  createBatch(input: CreateBatchInput): Batch {
    const batch: Batch = { id: createId('bat'), createdAt: new Date().toISOString(), ...input };
    this.batches.set(batch.id, batch);
    return batch;
  }

  getBatch(id: string): Batch | undefined {
    return this.batches.get(id);
  }

  batchStats(batchId: string): BatchStats {
    let total = 0;
    let unused = 0;
    let used = 0;
    let frozen = 0;
    for (const card of this.cards.values()) {
      if (card.batchId !== batchId) continue;
      total += 1;
      if (card.status === CARD_STATUS.UNUSED) unused += 1;
      else if (card.status === CARD_STATUS.USED) used += 1;
      else frozen += 1;
    }
    return { total, unused, used, frozen, usedRate: total === 0 ? 0 : Number(((used / total) * 100).toFixed(1)) };
  }

  listBatches(query: { keyword?: string; benefitType?: BenefitType; page: number; pageSize: number }): Paged<BatchWithStats> {
    let items = Array.from(this.batches.values());
    if (query.benefitType) items = items.filter((b) => b.benefitType === query.benefitType);
    if (query.keyword) {
      const kw = query.keyword.trim().toLowerCase();
      items = items.filter(
        (b) =>
          b.batchNo.toLowerCase().includes(kw) ||
          b.name.toLowerCase().includes(kw) ||
          (b.remark ?? '').toLowerCase().includes(kw),
      );
    }
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    const paged = items.slice(start, start + query.pageSize).map((b) => ({ ...b, stats: this.batchStats(b.id) }));
    return { items: paged, total, page: query.page, pageSize: query.pageSize };
  }

  insertCards(cards: Card[]): void {
    for (const card of cards) {
      if (this.codeIndex.has(card.code)) {
        throw new Error(`卡密重复：${card.displayCode}`);
      }
      this.cards.set(card.id, card);
      this.codeIndex.set(card.code, card.id);
    }
  }

  getCardById(id: string): Card | undefined {
    return this.cards.get(id);
  }

  getCardByCode(code: string): Card | undefined {
    const id = this.codeIndex.get(code);
    return id ? this.cards.get(id) : undefined;
  }

  hasCode(code: string): boolean {
    return this.codeIndex.has(code);
  }

  saveCard(card: Card): void {
    this.cards.set(card.id, card);
  }

  listCards(query: CardQuery): Paged<Card> {
    let items = Array.from(this.cards.values());

    if (query.status?.length) {
      const set = new Set(query.status);
      items = items.filter((c) => set.has(c.status));
    }
    if (query.benefitType) items = items.filter((c) => c.benefitType === query.benefitType);
    if (query.benefitPeriod) items = items.filter((c) => c.benefitPeriod === query.benefitPeriod);
    if (query.batchId) items = items.filter((c) => c.batchId === query.batchId);
    if (query.usedByUserAccount) {
      const account = query.usedByUserAccount.trim().toLowerCase();
      items = items.filter((c) => (c.usedByUserAccount ?? '').toLowerCase().includes(account));
    }
    if (query.createdFrom) items = items.filter((c) => c.createdAt >= query.createdFrom!);
    if (query.createdTo) items = items.filter((c) => c.createdAt <= query.createdTo!);
    if (query.expiresBefore) {
      const limit = query.expiresBefore;
      items = items.filter((c) => c.expiresAt !== null && c.expiresAt <= limit);
    }
    if (query.keyword) {
      const kw = query.keyword.trim().toLowerCase();
      const batchNos = new Map<string, string>();
      for (const b of this.batches.values()) batchNos.set(b.id, b.batchNo.toLowerCase());
      items = items.filter((c) => {
        if (c.code.toLowerCase().includes(kw)) return true;
        if (c.displayCode.toLowerCase().includes(kw)) return true;
        if ((c.usedByUserAccount ?? '').toLowerCase().includes(kw)) return true;
        if ((c.usedByUserId ?? '').toLowerCase().includes(kw)) return true;
        if (c.members.some((m) => m.account.toLowerCase().includes(kw) || m.userId.toLowerCase().includes(kw))) return true;
        if ((batchNos.get(c.batchId) ?? '').includes(kw)) return true;
        return false;
      });
    }

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    return { items: items.slice(start, start + query.pageSize), total, page: query.page, pageSize: query.pageSize };
  }

  updateCardStatus(ids: string[], status: CardStatus, onlyFrom?: CardStatus[]): number {
    let changed = 0;
    const allow = onlyFrom ? new Set(onlyFrom) : null;
    for (const id of ids) {
      const card = this.cards.get(id);
      if (!card) continue;
      if (allow && !allow.has(card.status)) continue;
      if (card.status === status) continue;
      card.status = status;
      changed += 1;
    }
    return changed;
  }

  updateCardsByBatch(batchId: string, status: CardStatus, onlyFrom?: CardStatus[]): number {
    const ids = Array.from(this.cards.values())
      .filter((c) => c.batchId === batchId)
      .map((c) => c.id);
    return this.updateCardStatus(ids, status, onlyFrom);
  }

  addLog(log: Omit<RedeemLog, 'id' | 'createdAt'>): RedeemLog {
    const entry: RedeemLog = { id: `log_${randomUUID()}`, createdAt: new Date().toISOString(), ...log };
    this.logs.unshift(entry);
    if (this.logs.length > 5000) this.logs.length = 5000;
    return entry;
  }

  listLogs(query: LogQuery): Paged<RedeemLog> {
    let items = this.logs;
    if (query.action) items = items.filter((l) => l.action === query.action);
    if (typeof query.success === 'boolean') items = items.filter((l) => l.success === query.success);
    if (query.cardCode) {
      const kw = query.cardCode.trim().toUpperCase();
      items = items.filter((l) => l.code.includes(kw) || l.displayCode.includes(kw) || (l.account ?? '').toUpperCase().includes(kw));
    }
    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    return { items: items.slice(start, start + query.pageSize), total, page: query.page, pageSize: query.pageSize };
  }

  overview(): OverviewStats {
    const byStatus = { 0: 0, 1: 0, 2: 0 } as Record<CardStatus, number>;
    const byBenefitType = { personal: 0, family: 0 } as Record<BenefitType, number>;
    const byBenefitPeriod = { month: 0, quarter: 0, year: 0, lifetime: 0 } as Record<BenefitPeriod, number>;
    const familySeats = { used: 0, total: 0 };
    const now = Date.now();
    const in7Days = now + 7 * 24 * 60 * 60 * 1000;
    let expiringIn7Days = 0;

    for (const card of this.cards.values()) {
      byStatus[card.status] += 1;
      byBenefitType[card.benefitType] += 1;
      byBenefitPeriod[card.benefitPeriod] += 1;
      if (card.benefitType === 'family') {
        familySeats.used += card.members.length;
        familySeats.total += card.groupSize;
      }
      if (card.status === CARD_STATUS.UNUSED && card.expiresAt) {
        const t = new Date(card.expiresAt).getTime();
        if (t > now && t <= in7Days) expiringIn7Days += 1;
      }
    }

    const total = this.cards.size;
    const trend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(new Date(now - i * 24 * 60 * 60 * 1000));
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      const count = this.logs.filter(
        (l) => l.success && (l.action === 'redeem' || l.action === 'join') && l.createdAt >= day.toISOString() && l.createdAt < next.toISOString(),
      ).length;
      trend.push({ date: day.toISOString().slice(0, 10), count });
    }

    return {
      total,
      byStatus,
      byBenefitType,
      byBenefitPeriod,
      batchCount: this.batches.size,
      usedRate: total === 0 ? 0 : Number(((byStatus[1] / total) * 100).toFixed(1)),
      familySeats,
      expiringIn7Days,
      redeemTrend: trend,
      recentRedemptions: this.logs.filter((l) => l.action === 'redeem' || l.action === 'join').slice(0, 5),
    };
  }

  reset(): void {
    this.cards.clear();
    this.codeIndex.clear();
    this.batches.clear();
    this.logs = [];
  }
}

export const store: DataStore = new MemoryStore();
export type { CardMember };
export const ENUMS = {
  cardStatus: CARD_STATUS_VALUES,
  benefitTypes: BENEFIT_TYPES,
  benefitPeriods: BENEFIT_PERIODS,
};
export { formatCardCode };
