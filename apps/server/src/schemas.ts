import { z } from 'zod';
import { BENEFIT_PERIODS, BENEFIT_TYPES, CARD_STATUS_VALUES } from './domain/types.js';

export const benefitTypeSchema = z.enum(BENEFIT_TYPES);
export const benefitPeriodSchema = z.enum(BENEFIT_PERIODS);
export const cardStatusSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

function dateBoundary(value: string | undefined, edge: 'start' | 'end'): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length === 10) {
    return edge === 'start' ? `${trimmed}T00:00:00.000Z` : `${trimmed}T23:59:59.999Z`;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export const listCardsQuerySchema = z.object({
  /** 逗号分隔的状态，如 0,1 */
  status: z.string().optional(),
  benefitType: benefitTypeSchema.optional(),
  benefitPeriod: benefitPeriodSchema.optional(),
  batchId: z.string().optional(),
  keyword: z.string().optional(),
  usedByUserAccount: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  expiresBefore: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});

export function parseCardQuery(raw: z.infer<typeof listCardsQuerySchema>) {
  const statusList = (raw.status ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n): n is 0 | 1 | 2 => CARD_STATUS_VALUES.includes(n as 0 | 1 | 2));

  return {
    status: statusList.length ? statusList : undefined,
    benefitType: raw.benefitType,
    benefitPeriod: raw.benefitPeriod,
    batchId: raw.batchId || undefined,
    keyword: raw.keyword || undefined,
    usedByUserAccount: raw.usedByUserAccount || undefined,
    createdFrom: dateBoundary(raw.createdFrom, 'start'),
    createdTo: dateBoundary(raw.createdTo, 'end'),
    expiresBefore: dateBoundary(raw.expiresBefore, 'end'),
    page: raw.page,
    pageSize: raw.pageSize,
  };
}

export const generateSchema = z
  .object({
    benefitType: benefitTypeSchema,
    benefitPeriod: benefitPeriodSchema,
    quantity: z.coerce.number().int().min(1).max(20000),
    batchName: z.string().trim().max(64).optional(),
    validityMode: z.enum(['days', 'date', 'never']).default('days'),
    validityDays: z.coerce.number().int().min(1).max(3650).optional(),
    expiresAt: z.string().optional(),
    remark: z.string().trim().max(200).optional(),
    groupSize: z.coerce.number().int().min(1).max(10).optional(),
  })
  .refine((v) => v.validityMode !== 'days' || (v.validityDays ?? 0) >= 1, {
    message: '按天数有效期时，必须填写大于 0 的有效天数',
    path: ['validityDays'],
  })
  .refine((v) => v.validityMode !== 'date' || !!v.expiresAt, {
    message: '按指定日期时，必须填写有效截止时间',
    path: ['expiresAt'],
  });

export const updateStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, '至少选择一张卡'),
  status: cardStatusSchema,
  /** 只允许从指定状态流转，避免误操作已核销的卡 */
  onlyFrom: z.array(cardStatusSchema).optional(),
});

export const exportSchema = z.object({
  format: z.enum(['csv', 'txt']).default('csv'),
  filters: listCardsQuerySchema.partial().optional(),
  ids: z.array(z.string()).optional(),
});

export const redeemSchema = z.object({
  cardCode: z.string().min(1, '请输入卡密'),
  userId: z.string().trim().min(1, '必须提供 used_by_user_id'),
  account: z.string().trim().min(1, '必须提供 used_by_user_account'),
  dryRun: z.boolean().optional(),
});

export const verifySchema = z.object({
  cardCode: z.string().min(1, '请输入卡密'),
  account: z.string().trim().optional(),
});
