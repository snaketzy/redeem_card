/** 与后端 apps/server/src/domain/types.ts 对齐的前端类型定义 */

export type CardStatus = 0 | 1 | 2;
export type BenefitType = 'personal' | 'family';
export type BenefitPeriod = 'month' | 'quarter' | 'year' | 'lifetime';
export type LogAction = 'generate' | 'verify' | 'redeem' | 'join' | 'freeze' | 'unfreeze' | 'void';

export interface CardMember {
  userId: string;
  account: string;
  joinedAt: string;
}

export interface Card {
  id: string;
  code: string;
  displayCode: string;
  status: CardStatus;
  benefitType: BenefitType;
  benefitPeriod: BenefitPeriod;
  batchId: string;
  groupSize: number;
  members: CardMember[];
  createdAt: string;
  expiresAt: string | null;
  usedByUserId: string | null;
  usedByUserAccount: string | null;
  usedAtDate: string | null;
}

export interface Batch {
  id: string;
  batchNo: string;
  name: string;
  benefitType: BenefitType;
  benefitPeriod: BenefitPeriod;
  quantity: number;
  groupSize: number;
  validityDays: number | null;
  expiresAt: string | null;
  remark: string | null;
  createdBy: string;
  createdAt: string;
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

export interface RedeemLog {
  id: string;
  cardId: string | null;
  code: string;
  displayCode: string;
  action: LogAction;
  success: boolean;
  message: string;
  userId: string | null;
  account: string | null;
  ip: string | null;
  createdAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CardListResponse extends Paged<Card> {
  batchNos: Record<string, string>;
}

export interface OverviewStats {
  total: number;
  byStatus: Record<CardStatus, number>;
  byBenefitType: Record<BenefitType, number>;
  byBenefitPeriod: Record<BenefitPeriod, number>;
  batchCount: number;
  usedRate: number;
  familySeats: { used: number; total: number };
  expiringIn7Days: number;
  redeemTrend: { date: string; count: number }[];
  recentRedemptions: RedeemLog[];
}

export type ValidityMode = 'days' | 'date' | 'never';

export interface GenerateCardsPayload {
  benefitType: BenefitType;
  benefitPeriod: BenefitPeriod;
  quantity: number;
  batchName?: string;
  validityMode: ValidityMode;
  validityDays?: number;
  expiresAt?: string;
  remark?: string;
  groupSize?: number;
}

export interface GenerateCardsResponse {
  batch: Batch;
  total: number;
  retries: number;
  preview: Card[];
}

export interface CardFilters {
  status?: CardStatus[];
  benefitType?: BenefitType;
  benefitPeriod?: BenefitPeriod;
  batchId?: string;
  keyword?: string;
  usedByUserAccount?: string;
  createdFrom?: string;
  createdTo?: string;
  expiresBefore?: string;
  page?: number;
  pageSize?: number;
}

export interface RedeemPayload {
  cardCode: string;
  userId: string;
  account: string;
  dryRun?: boolean;
}

export interface RedeemResponse {
  success: boolean;
  outcome: 'redeemed' | 'joined' | 'already-member';
  message: string;
  benefit: string;
  remainingSeats: number;
  usedAtDate: string;
  card: Card;
}

export interface VerifyResponse {
  usable: boolean;
  reason: string;
  benefit: string;
  remainingSeats: number;
  card: Card;
}

export interface MetaEnumOption<T extends string | number = string> {
  value: T;
  label: string;
}

export interface MetaResponse {
  cardStatus: MetaEnumOption<CardStatus>[];
  benefitType: MetaEnumOption<BenefitType>[];
  benefitPeriod: (MetaEnumOption<BenefitPeriod> & {
    defaultDays: number | null;
    /** 自然月数：用于推算权益期截止日，永久卡为 null */
    periodMonths: number | null;
  })[];
  /** 永久卡的权益期截止日 */
  lifetimeRightsUntil: string;
  logAction: MetaEnumOption<LogAction>[];
  cardFormat: {
    alphabet: string;
    length: number;
    groups: number;
    groupSize: number;
    separator: string;
    sample: string;
    familyGroupSize: number;
  };
}
