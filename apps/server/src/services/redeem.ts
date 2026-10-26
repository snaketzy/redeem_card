import {
  BENEFIT_PERIOD_LABEL,
  BENEFIT_TYPE_LABEL,
  CARD_STATUS,
  CARD_STATUS_LABEL,
  type Card,
} from '../domain/types.js';
import { parseCardCode } from '../lib/cardCode.js';
import { ApiError } from '../lib/http.js';
import { store } from '../store/memoryStore.js';

export interface RedeemContext {
  userId: string;
  account: string;
  ip?: string | null;
  /** 仅校验不核销 */
  dryRun?: boolean;
}

export interface RedeemResult {
  ok: true;
  /** 本次是首次核销 / 家庭卡加入 / 幂等重复提交 */
  outcome: 'redeemed' | 'joined' | 'already-member';
  card: Card;
  /** 权益描述 */
  benefit: string;
  /** 家庭卡剩余可加入名额 */
  remainingSeats: number;
  usedAtDate: string;
  message: string;
}

/** 校验卡密输入格式，格式不合法直接抛出可读错误，不消耗数据库查询 */
export function resolveCard(rawInput: string) {
  const parsed = parseCardCode(rawInput);
  if (!parsed.ok) {
    throw ApiError.badRequest(parsed.reason ?? '卡密格式不正确');
  }
  const card = store.getCardByCode(parsed.raw);
  if (!card) {
    throw ApiError.notFound('卡密不存在，请确认是否输入有误');
  }
  return { parsed, card };
}

function assertUsable(card: Card) {
  if (card.status === CARD_STATUS.FROZEN) {
    throw ApiError.forbidden('该卡密已冻结或作废，无法使用');
  }
  if (card.expiresAt && new Date(card.expiresAt).getTime() < Date.now()) {
    throw ApiError.gone(`该卡密已于 ${card.expiresAt.slice(0, 10)} 过期`);
  }
}

function benefitText(card: Card) {
  return `${BENEFIT_TYPE_LABEL[card.benefitType]} · ${BENEFIT_PERIOD_LABEL[card.benefitPeriod]}`;
}

/**
 * 核销卡密。
 * - 个人卡：一次性核销，已使用则返回 409；
 * - 家庭卡：4 人一组共享，依次允许 4 个不同 userId 加入，同一 userId 重复提交幂等返回。
 */
export function redeemCard(rawInput: string, ctx: RedeemContext): RedeemResult {
  const { card } = resolveCard(rawInput);

  if (ctx.dryRun) {
    assertUsable(card);
    if (card.benefitType === 'personal' && card.status === CARD_STATUS.USED) {
      throw ApiError.conflict(`该卡密已被 ${card.usedByUserAccount ?? card.usedByUserId} 于 ${card.usedAtDate?.slice(0, 10)} 使用`);
    }
    return {
      ok: true,
      outcome: 'redeemed',
      card,
      benefit: benefitText(card),
      remainingSeats: Math.max(card.groupSize - card.members.length, 0),
      usedAtDate: card.usedAtDate ?? '',
      message: '卡密校验通过（未核销）',
    };
  }

  assertUsable(card);

  if (!ctx.userId || !ctx.account) {
    throw ApiError.badRequest('核销必须提供 used_by_user_id 与 used_by_user_account');
  }

  if (card.benefitType === 'family') {
    const existing = card.members.find((m) => m.userId === ctx.userId);
    if (existing) {
      store.addLog({
        cardId: card.id,
        code: card.code,
        displayCode: card.displayCode,
        action: 'join',
        success: true,
        message: `用户 ${ctx.account} 重复提交，幂等返回（已在家庭组内）`,
        userId: ctx.userId,
        account: ctx.account,
        ip: ctx.ip ?? null,
      });
      return {
        ok: true,
        outcome: 'already-member',
        card,
        benefit: benefitText(card),
        remainingSeats: Math.max(card.groupSize - card.members.length, 0),
        usedAtDate: card.usedAtDate ?? '',
        message: '你已在该家庭卡权益组内，直接生效',
      };
    }
    if (card.members.length >= card.groupSize) {
      throw ApiError.conflict(`该家庭卡权益组已满（${card.groupSize} 人），无法再加入`);
    }

    const now = new Date().toISOString();
    card.members.push({ userId: ctx.userId, account: ctx.account, joinedAt: now });
    if (!card.usedByUserId) {
      card.usedByUserId = ctx.userId;
      card.usedByUserAccount = ctx.account;
      card.usedAtDate = now;
    }
    card.status = CARD_STATUS.USED;
    store.saveCard(card);

    const remainingSeats = card.groupSize - card.members.length;
    const message = `已加入家庭卡权益组，当前 ${card.members.length}/${card.groupSize} 人，剩余 ${remainingSeats} 个名额`;
    store.addLog({
      cardId: card.id,
      code: card.code,
      displayCode: card.displayCode,
      action: 'join',
      success: true,
      message,
      userId: ctx.userId,
      account: ctx.account,
      ip: ctx.ip ?? null,
    });
    return { ok: true, outcome: 'joined', card, benefit: benefitText(card), remainingSeats, usedAtDate: now, message };
  }

  if (card.status === CARD_STATUS.USED) {
    store.addLog({
      cardId: card.id,
      code: card.code,
      displayCode: card.displayCode,
      action: 'redeem',
      success: false,
      message: `卡密已被 ${card.usedByUserAccount ?? card.usedByUserId} 使用于 ${card.usedAtDate}`,
      userId: ctx.userId,
      account: ctx.account,
      ip: ctx.ip ?? null,
    });
    throw ApiError.conflict(
      `该卡密已被使用（状态：${CARD_STATUS_LABEL[card.status]}），使用账号 ${card.usedByUserAccount ?? '-'}，核销时间 ${card.usedAtDate?.slice(0, 19).replace('T', ' ') ?? '-'}`,
    );
  }

  const now = new Date().toISOString();
  card.status = CARD_STATUS.USED;
  card.usedByUserId = ctx.userId;
  card.usedByUserAccount = ctx.account;
  card.usedAtDate = now;
  card.members = [{ userId: ctx.userId, account: ctx.account, joinedAt: now }];
  store.saveCard(card);

  store.addLog({
    cardId: card.id,
    code: card.code,
    displayCode: card.displayCode,
    action: 'redeem',
    success: true,
    message: `核销成功：${benefitText(card)}`,
    userId: ctx.userId,
    account: ctx.account,
    ip: ctx.ip ?? null,
  });

  return {
    ok: true,
    outcome: 'redeemed',
    card,
    benefit: benefitText(card),
    remainingSeats: Math.max(card.groupSize - card.members.length, 0),
    usedAtDate: now,
    message: `核销成功，已开通 ${benefitText(card)}`,
  };
}

/** 仅校验卡密可用性，不改变任何状态 */
export function verifyCard(rawInput: string, ctx: { ip?: string | null; account?: string | null }) {
  const { card } = resolveCard(rawInput);
  const now = Date.now();
  const expired = card.expiresAt !== null && new Date(card.expiresAt).getTime() < now;

  let usable = true;
  let reason = '卡密可正常使用';
  if (card.status === CARD_STATUS.FROZEN) {
    usable = false;
    reason = '该卡密已冻结或作废';
  } else if (expired) {
    usable = false;
    reason = '该卡密已过期';
  } else if (card.benefitType === 'personal' && card.status === CARD_STATUS.USED) {
    usable = false;
    reason = '该卡密已被使用';
  } else if (card.benefitType === 'family' && card.members.length >= card.groupSize) {
    usable = false;
    reason = `该家庭卡权益组已满（${card.groupSize} 人）`;
  }

  store.addLog({
    cardId: card.id,
    code: card.code,
    displayCode: card.displayCode,
    action: 'verify',
    success: usable,
    message: reason,
    userId: null,
    account: ctx.account ?? null,
    ip: ctx.ip ?? null,
  });

  return {
    usable,
    reason,
    card,
    benefit: benefitText(card),
    remainingSeats: Math.max(card.groupSize - card.members.length, 0),
  };
}
