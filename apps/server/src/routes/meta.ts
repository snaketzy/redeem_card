import { Router } from 'express';
import {
  BENEFIT_PERIOD_DAYS,
  BENEFIT_PERIOD_LABEL,
  BENEFIT_PERIOD_MONTHS,
  BENEFIT_PERIODS,
  BENEFIT_TYPE_LABEL,
  BENEFIT_TYPES,
  CARD_ALPHABET_LABEL,
  CARD_STATUS_LABEL,
  CARD_STATUS_VALUES,
  FAMILY_GROUP_SIZE,
  LIFETIME_RIGHTS_UNTIL,
  LOG_ACTION_LABEL,
} from '../domain/types.js';
import { CARD_LENGTH, CARD_SEPARATOR } from '../lib/cardCode.js';

export const metaRouter = Router();

metaRouter.get('/', (_req, res) => {
  res.json({
    cardStatus: CARD_STATUS_VALUES.map((value) => ({ value, label: CARD_STATUS_LABEL[value] })),
    benefitType: BENEFIT_TYPES.map((value) => ({ value, label: BENEFIT_TYPE_LABEL[value] })),
    benefitPeriod: BENEFIT_PERIODS.map((value) => ({
      value,
      label: BENEFIT_PERIOD_LABEL[value],
      /** 永久卡无固定天数，返回 null，由前端按永久卡口径展示 */
      defaultDays: value === 'lifetime' ? null : BENEFIT_PERIOD_DAYS[value],
      /** 自然月数：前端据此推算权益期截止日（N 个自然月后的前一日） */
      periodMonths: value === 'lifetime' ? null : BENEFIT_PERIOD_MONTHS[value],
    })),
    logAction: Object.entries(LOG_ACTION_LABEL).map(([value, label]) => ({ value, label })),
    /** 永久卡的权益期截止日（卡片图样与统计口径统一从这里取） */
    lifetimeRightsUntil: LIFETIME_RIGHTS_UNTIL,
    cardFormat: {
      alphabet: CARD_ALPHABET_LABEL,
      length: CARD_LENGTH,
      groups: 4,
      groupSize: 4,
      separator: CARD_SEPARATOR,
      sample: 'ABCD-EFGH-JKMN-PQRS',
      familyGroupSize: FAMILY_GROUP_SIZE,
    },
  });
});
