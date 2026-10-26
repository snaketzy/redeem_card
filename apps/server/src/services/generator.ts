import {
  BENEFIT_PERIOD_LABEL,
  BENEFIT_TYPE_LABEL,
  CARD_STATUS,
  FAMILY_GROUP_SIZE,
  LIFETIME_EXPIRES_AT,
  PERSONAL_GROUP_SIZE,
  type Batch,
  type BenefitPeriod,
  type BenefitType,
  type Card,
} from '../domain/types.js';
import { formatCardCode, generateRawCode, MAX_BATCH_QUANTITY } from '../lib/cardCode.js';
import { createBatchNo, createId } from '../lib/id.js';
import { store } from '../store/memoryStore.js';

export type ValidityMode = 'days' | 'date' | 'never';

export interface GenerateCardsInput {
  benefitType: BenefitType;
  benefitPeriod: BenefitPeriod;
  quantity: number;
  batchName?: string | null;
  validityMode: ValidityMode;
  validityDays?: number | null;
  expiresAt?: string | null;
  remark?: string | null;
  /** 家庭卡共享人数，默认 4 */
  groupSize?: number | null;
  createdBy?: string;
}

export interface GenerateCardsResult {
  batch: Batch;
  cards: Card[];
  /** 去重重试次数，用于观测生成质量 */
  retries: number;
}

function resolveExpiresAt(input: GenerateCardsInput): string | null {
  // 永久卡：权益期固定到 2099-12-31，直接落库为 expires_at，不随有效期设置变化
  if (input.benefitPeriod === 'lifetime') return LIFETIME_EXPIRES_AT;
  const now = new Date();
  if (input.validityMode === 'never') return null;
  if (input.validityMode === 'date') return input.expiresAt ?? null;
  const days = input.validityDays ?? 365;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * 批量生成卡密：
 * 1. 用 crypto 随机生成，不做任何自增/序列化处理；
 * 2. 批次内 Set 去重 + 全局 codeIndex 去重（落库层还有唯一索引兜底）；
 * 3. 家庭卡 groupSize 默认 4，个人卡固定 1。
 */
export function generateCards(input: GenerateCardsInput): GenerateCardsResult {
  const quantity = Math.min(Math.max(Math.trunc(input.quantity), 1), MAX_BATCH_QUANTITY);
  const groupSize = input.benefitType === 'family' ? (input.groupSize ?? FAMILY_GROUP_SIZE) : PERSONAL_GROUP_SIZE;
  const expiresAt = resolveExpiresAt(input);
  const createdAt = new Date().toISOString();

  const codes: string[] = [];
  const seen = new Set<string>();
  let retries = 0;
  const maxAttempts = quantity * 20;

  while (codes.length < quantity && retries < maxAttempts) {
    const raw = generateRawCode();
    retries += 1;
    if (seen.has(raw) || store.hasCode(raw)) continue;
    seen.add(raw);
    codes.push(raw);
  }

  const batch = store.createBatch({
    batchNo: createBatchNo(),
    name: input.batchName?.trim() || `${BENEFIT_TYPE_LABEL[input.benefitType]} · ${BENEFIT_PERIOD_LABEL[input.benefitPeriod]}`,
    benefitType: input.benefitType,
    benefitPeriod: input.benefitPeriod,
    quantity: codes.length,
    groupSize,
    validityDays: input.validityMode === 'days' ? (input.validityDays ?? 365) : null,
    expiresAt,
    remark: input.remark?.trim() || null,
    createdBy: input.createdBy ?? 'system',
  });

  const cards: Card[] = codes.map((code) => ({
    id: createId('card'),
    code,
    displayCode: formatCardCode(code),
    status: CARD_STATUS.UNUSED,
    benefitType: input.benefitType,
    benefitPeriod: input.benefitPeriod,
    batchId: batch.id,
    groupSize,
    members: [],
    createdAt,
    expiresAt,
    usedByUserId: null,
    usedByUserAccount: null,
    usedAtDate: null,
  }));

  store.insertCards(cards);
  store.addLog({
    cardId: null,
    code: '-',
    displayCode: '-',
    action: 'generate',
    success: true,
    message: `批次 ${batch.batchNo} 生成 ${cards.length} 张${BENEFIT_TYPE_LABEL[input.benefitType]}（${BENEFIT_PERIOD_LABEL[input.benefitPeriod]}）`,
    userId: null,
    account: input.createdBy ?? 'system',
    ip: null,
  });

  return { batch, cards, retries };
}
