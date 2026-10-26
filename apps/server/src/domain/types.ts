/**
 * 点卡领域模型与枚举定义。
 * 前端通过 GET /api/meta 拉取这些枚举的中文文案，保证前后端单一数据源。
 */

/** 状态：0 未激活/未使用，1 已使用，2 已冻结/作废 */
export const CARD_STATUS = {
  UNUSED: 0,
  USED: 1,
  FROZEN: 2,
} as const;

export type CardStatus = 0 | 1 | 2;

export const CARD_STATUS_VALUES: CardStatus[] = [0, 1, 2];

export const CARD_STATUS_LABEL: Record<CardStatus, string> = {
  0: '未激活',
  1: '已使用',
  2: '已冻结',
};

/** 权益类型：个人卡 / 家庭卡（家庭卡支持 4 人一组共享权益） */
export const BENEFIT_TYPES = ['personal', 'family'] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];

export const BENEFIT_TYPE_LABEL: Record<BenefitType, string> = {
  personal: '个人卡',
  family: '家庭卡',
};

/** 权益周期：月卡 / 季卡 / 年卡 / 永久卡 */
export const BENEFIT_PERIODS = ['month', 'quarter', 'year', 'lifetime'] as const;
export type BenefitPeriod = (typeof BENEFIT_PERIODS)[number];

export const BENEFIT_PERIOD_LABEL: Record<BenefitPeriod, string> = {
  month: '月卡',
  quarter: '季卡',
  year: '年卡',
  lifetime: '永久卡',
};

/** 权益周期天数：永久卡不按天数计算，故排除在外 */
export const BENEFIT_PERIOD_DAYS: Record<Exclude<BenefitPeriod, 'lifetime'>, number> = {
  month: 30,
  quarter: 90,
  year: 365,
};

/** 权益周期对应的自然月数：用于按自然周期推算权益期截止日（永久卡不计） */
export const BENEFIT_PERIOD_MONTHS: Record<Exclude<BenefitPeriod, 'lifetime'>, number> = {
  month: 1,
  quarter: 3,
  year: 12,
};

/** 永久卡权益期截止时间：生成时直接写入卡片的 expires_at */
export const LIFETIME_EXPIRES_AT = '2099-12-31T23:59:59.999Z';
/** 永久卡权益期截止日（展示口径，与 expires_at 同源） */
export const LIFETIME_RIGHTS_UNTIL = LIFETIME_EXPIRES_AT.slice(0, 10);

/** 卡密字符集（与 lib/cardCode.ts 保持一致，供 /api/meta 输出给前端展示） */
export const CARD_ALPHABET_LABEL = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** 家庭卡默认共享人数 */
export const FAMILY_GROUP_SIZE = 4;
/** 个人卡共享人数 */
export const PERSONAL_GROUP_SIZE = 1;

/** 家庭卡成员（共享权益的使用者） */
export interface CardMember {
  userId: string;
  account: string;
  joinedAt: string;
}

export interface Card {
  /** 内部主键（非自增，cuid 风格随机串），绝不作为卡密对外暴露 */
  id: string;
  /** 卡密本体（去掉分隔符的大写串，唯一索引） */
  code: string;
  /** 展示用卡密，形如 ABCD-EFGH-JKMN-PQRS */
  displayCode: string;
  /** 状态 */
  status: CardStatus;
  /** 权益类型 */
  benefitType: BenefitType;
  /** 权益周期 */
  benefitPeriod: BenefitPeriod;
  /** 所属批次 */
  batchId: string;
  /** 该卡可共享的人数（个人卡 1，家庭卡 4） */
  groupSize: number;
  /** 已加入的成员（个人卡最多 1 条） */
  members: CardMember[];
  /** 创建时间 */
  createdAt: string;
  /** 卡密有效截止时间 */
  expiresAt: string | null;
  /** 使用者用户 ID（家庭卡为首位激活者） */
  usedByUserId: string | null;
  /** 使用者登录账号 */
  usedByUserAccount: string | null;
  /** 核销使用时间 */
  usedAtDate: string | null;
}

export interface Batch {
  id: string;
  /** 批次号，形如 B20261026-7K3Q */
  batchNo: string;
  name: string;
  benefitType: BenefitType;
  benefitPeriod: BenefitPeriod;
  /** 计划生成数量 */
  quantity: number;
  groupSize: number;
  /** 有效期天数（validityMode = days 时生效） */
  validityDays: number | null;
  /** 统一过期时间（validityMode = date 时生效） */
  expiresAt: string | null;
  remark: string | null;
  createdBy: string;
  createdAt: string;
}

export type LogAction = 'generate' | 'verify' | 'redeem' | 'join' | 'freeze' | 'unfreeze' | 'void';

export const LOG_ACTION_LABEL: Record<LogAction, string> = {
  generate: '生成',
  verify: '校验',
  redeem: '核销',
  join: '家庭卡加入',
  freeze: '冻结',
  unfreeze: '解冻',
  void: '作废',
};

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
