import { useMemo } from 'react';
import { useGetMetaQuery } from '@/store/cardApi';
import type { BenefitPeriod, BenefitType, CardStatus, LogAction } from '@/types';

const FALLBACK = {
  cardStatus: { 0: '未激活', 1: '已使用', 2: '已冻结' } as Record<CardStatus, string>,
  benefitType: { personal: '个人卡', family: '家庭卡' } as Record<BenefitType, string>,
  benefitPeriod: { month: '月卡', quarter: '季卡', year: '年卡', lifetime: '永久卡' } as Record<
    BenefitPeriod,
    string
  >,
  logAction: {
    generate: '生成',
    verify: '校验',
    redeem: '核销',
    join: '家庭卡加入',
    freeze: '冻结',
    unfreeze: '解冻',
    void: '作废',
  } as Record<LogAction, string>,
  periodDays: { month: 30, quarter: 90, year: 365 } as Record<Exclude<BenefitPeriod, 'lifetime'>, number>,
  /** 权益周期对应的自然月数，用于推算权益期截止日 */
  periodMonths: { month: 1, quarter: 3, year: 12 } as Record<Exclude<BenefitPeriod, 'lifetime'>, number>,
  /** 永久卡的权益期截止日，与后端 /api/meta 的 lifetimeRightsUntil 保持一致 */
  lifetimeRightsUntil: '2099-12-31',
};

/** 统一从 /api/meta 取枚举文案，避免前端各处硬编码中文 */
export function useMetaLabels() {
  const { data } = useGetMetaQuery();

  return useMemo(() => {
    const statusMap = { ...FALLBACK.cardStatus };
    const typeMap = { ...FALLBACK.benefitType };
    const periodMap = { ...FALLBACK.benefitPeriod };
    const actionMap = { ...FALLBACK.logAction };
    const periodDaysMap = { ...FALLBACK.periodDays };
    const periodMonthsMap = { ...FALLBACK.periodMonths };

    data?.cardStatus.forEach((item) => {
      statusMap[item.value] = item.label;
    });
    data?.benefitType.forEach((item) => {
      typeMap[item.value] = item.label;
    });
    data?.benefitPeriod.forEach((item) => {
      periodMap[item.value] = item.label;
      if (item.value !== 'lifetime' && item.defaultDays !== null) {
        periodDaysMap[item.value] = item.defaultDays;
      }
      if (item.value !== 'lifetime' && item.periodMonths !== null) {
        periodMonthsMap[item.value] = item.periodMonths;
      }
    });
    data?.logAction.forEach((item) => {
      actionMap[item.value] = item.label;
    });

    return {
      meta: data,
      statusLabel: (status: CardStatus) => statusMap[status] ?? String(status),
      typeLabel: (type: BenefitType) => typeMap[type] ?? type,
      periodLabel: (period: BenefitPeriod) => periodMap[period] ?? period,
      actionLabel: (action: LogAction) => actionMap[action] ?? action,
      /** 权益周期天数；永久卡返回 null，由调用方按永久卡口径处理 */
      periodDays: (period: BenefitPeriod): number | null =>
        period === 'lifetime' ? null : periodDaysMap[period],
      /** 权益周期对应的自然月数；永久卡返回 null */
      periodMonths: (period: BenefitPeriod): number | null =>
        period === 'lifetime' ? null : periodMonthsMap[period],
      lifetimeRightsUntil: data?.lifetimeRightsUntil ?? FALLBACK.lifetimeRightsUntil,
      statusOptions: data?.cardStatus ?? [
        { value: 0 as CardStatus, label: FALLBACK.cardStatus[0] },
        { value: 1 as CardStatus, label: FALLBACK.cardStatus[1] },
        { value: 2 as CardStatus, label: FALLBACK.cardStatus[2] },
      ],
      typeOptions: data?.benefitType ?? [
        { value: 'personal' as BenefitType, label: FALLBACK.benefitType.personal },
        { value: 'family' as BenefitType, label: FALLBACK.benefitType.family },
      ],
      periodOptions: data?.benefitPeriod ?? [
        {
          value: 'month' as BenefitPeriod,
          label: FALLBACK.benefitPeriod.month,
          defaultDays: 30,
          periodMonths: 1,
        },
        {
          value: 'quarter' as BenefitPeriod,
          label: FALLBACK.benefitPeriod.quarter,
          defaultDays: 90,
          periodMonths: 3,
        },
        {
          value: 'year' as BenefitPeriod,
          label: FALLBACK.benefitPeriod.year,
          defaultDays: 365,
          periodMonths: 12,
        },
        {
          value: 'lifetime' as BenefitPeriod,
          label: FALLBACK.benefitPeriod.lifetime,
          defaultDays: null,
          periodMonths: null,
        },
      ],
      logActionOptions: data?.logAction ?? Object.entries(FALLBACK.logAction).map(([value, label]) => ({
        value: value as LogAction,
        label,
      })),
    };
  }, [data]);
}
