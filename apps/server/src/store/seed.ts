import {
  BENEFIT_PERIOD_DAYS,
  CARD_STATUS,
  FAMILY_GROUP_SIZE,
  PERSONAL_GROUP_SIZE,
  type BenefitPeriod,
  type BenefitType,
  type Card,
} from '../domain/types.js';
import { formatCardCode, generateRawCode } from '../lib/cardCode.js';
import { createBatchNo, createId } from '../lib/id.js';
import { store } from './memoryStore.js';

/**
 * 演示种子数据（Mock）。
 * 接入 MySQL 后此文件可整体删除，改由迁移脚本 + 真实业务数据提供。
 */

const DAY = 24 * 60 * 60 * 1000;

const DEMO_USERS = [
  { userId: 'U100231', account: 'jerry.chen@ruizhi.com' },
  { userId: 'U100232', account: 'lisa.wang@ruizhi.com' },
  { userId: 'U100233', account: 'kai.zhou@ruizhi.com' },
  { userId: 'U100234', account: 'mia.liu@ruizhi.com' },
  { userId: 'U100235', account: 'tony.xu@ruizhi.com' },
  { userId: 'U100236', account: 'nancy.gu@ruizhi.com' },
  { userId: 'U100237', account: 'peter.han@ruizhi.com' },
  { userId: 'U100238', account: 'eric.zhao@ruizhi.com' },
];

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function takeUniqueCodes(quantity: number): string[] {
  const codes: string[] = [];
  const seen = new Set<string>();
  while (codes.length < quantity) {
    const raw = generateRawCode();
    if (seen.has(raw) || store.hasCode(raw)) continue;
    seen.add(raw);
    codes.push(raw);
  }
  return codes;
}

interface SeedBatchOptions {
  name: string;
  benefitType: BenefitType;
  benefitPeriod: BenefitPeriod;
  quantity: number;
  createdDaysAgo: number;
  validityDays: number | null;
  remark?: string;
  /** 已核销比例 0-1 */
  usedRatio: number;
  /** 冻结比例 0-1 */
  frozenRatio?: number;
  /** 家庭卡每张卡的加入人数分布 */
  familyJoinRange?: [number, number];
}

function createSeedBatch(options: SeedBatchOptions): { cards: Card[]; batchId: string; batchNo: string } {
  const createdAt = new Date(Date.now() - options.createdDaysAgo * DAY);
  const expiresAt =
    options.validityDays === null ? null : new Date(createdAt.getTime() + options.validityDays * DAY).toISOString();
  const groupSize = options.benefitType === 'family' ? FAMILY_GROUP_SIZE : PERSONAL_GROUP_SIZE;

  const batch = store.createBatch({
    batchNo: createBatchNo(createdAt),
    name: options.name,
    benefitType: options.benefitType,
    benefitPeriod: options.benefitPeriod,
    quantity: options.quantity,
    groupSize,
    validityDays: options.validityDays,
    expiresAt,
    remark: options.remark ?? null,
    createdBy: 'admin',
  });
  // createBatch 使用当前时间，这里按需要回填为历史时间点，让趋势图更真实
  batch.createdAt = createdAt.toISOString();

  const codes = takeUniqueCodes(options.quantity);
  const cards: Card[] = codes.map((code) => ({
    id: createId('card'),
    code,
    displayCode: formatCardCode(code),
    status: CARD_STATUS.UNUSED,
    benefitType: options.benefitType,
    benefitPeriod: options.benefitPeriod,
    batchId: batch.id,
    groupSize,
    members: [],
    createdAt: createdAt.toISOString(),
    expiresAt,
    usedByUserId: null,
    usedByUserAccount: null,
    usedAtDate: null,
  }));
  store.insertCards(cards);

  const shuffled = shuffle(cards);
  const usedCount = Math.round(cards.length * options.usedRatio);
  const frozenCount = Math.round(cards.length * (options.frozenRatio ?? 0.04));

  for (let i = 0; i < usedCount; i++) {
    const card = shuffled[i];
    const daysAgo = Math.min(options.createdDaysAgo, 1 + Math.floor(Math.random() * 14));
    const usedAt = new Date(Date.now() - daysAgo * DAY - Math.floor(Math.random() * DAY)).toISOString();

    if (card.benefitType === 'family') {
      const [min, max] = options.familyJoinRange ?? [1, FAMILY_GROUP_SIZE];
      const joinCount = Math.min(card.groupSize, min + Math.floor(Math.random() * (max - min + 1)));
      const members = shuffle(DEMO_USERS).slice(0, joinCount);
      card.members = members.map((user, index) => ({
        userId: user.userId,
        account: user.account,
        joinedAt: new Date(new Date(usedAt).getTime() + index * 6 * 60 * 60 * 1000).toISOString(),
      }));
      card.usedByUserId = card.members[0].userId;
      card.usedByUserAccount = card.members[0].account;
      card.usedAtDate = usedAt;
    } else {
      const user = DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)];
      card.usedByUserId = user.userId;
      card.usedByUserAccount = user.account;
      card.usedAtDate = usedAt;
      card.members = [{ userId: user.userId, account: user.account, joinedAt: usedAt }];
    }
    card.status = CARD_STATUS.USED;

    const log = store.addLog({
      cardId: card.id,
      code: card.code,
      displayCode: card.displayCode,
      action: card.benefitType === 'family' ? 'join' : 'redeem',
      success: true,
      message: `核销成功：${card.displayCode}`,
      userId: card.usedByUserId,
      account: card.usedByUserAccount,
      ip: '10.20.31.77',
    });
    log.createdAt = usedAt;
  }

  for (let i = usedCount; i < usedCount + frozenCount && i < shuffled.length; i++) {
    shuffled[i].status = CARD_STATUS.FROZEN;
  }

  return { cards, batchId: batch.id, batchNo: batch.batchNo };
}

export function seedDemoData(): { batches: number; cards: number } {
  createSeedBatch({
    name: '2026 Q1 个人月卡 · 电商渠道',
    benefitType: 'personal',
    benefitPeriod: 'month',
    quantity: 320,
    createdDaysAgo: 26,
    validityDays: BENEFIT_PERIOD_DAYS.month * 12,
    usedRatio: 0.42,
    remark: '渠道：天猫旗舰店，导出后交由客服发放',
  });

  createSeedBatch({
    name: '家庭年卡 · 企业福利批次',
    benefitType: 'family',
    benefitPeriod: 'year',
    quantity: 180,
    createdDaysAgo: 18,
    validityDays: BENEFIT_PERIOD_DAYS.year,
    usedRatio: 0.55,
    frozenRatio: 0.03,
    familyJoinRange: [1, FAMILY_GROUP_SIZE],
    remark: '每张卡最多 4 名成员共享，成员可分批加入',
  });

  createSeedBatch({
    name: '个人季卡 · 线下门店召回',
    benefitType: 'personal',
    benefitPeriod: 'quarter',
    quantity: 260,
    createdDaysAgo: 9,
    validityDays: BENEFIT_PERIOD_DAYS.quarter * 2,
    usedRatio: 0.28,
    remark: '门店扫码激活，配合短信触达',
  });

  createSeedBatch({
    name: '家庭月卡 · 内部灰度测试',
    benefitType: 'family',
    benefitPeriod: 'month',
    quantity: 60,
    createdDaysAgo: 3,
    validityDays: BENEFIT_PERIOD_DAYS.month,
    usedRatio: 0.35,
    familyJoinRange: [1, 3],
    remark: '灰度验证家庭组权益互斥逻辑',
  });

  const overview = store.overview();
  return { batches: overview.batchCount, cards: overview.total };
}
