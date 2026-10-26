import { Router } from 'express';
import { BENEFIT_PERIOD_LABEL, BENEFIT_TYPE_LABEL, CARD_STATUS_LABEL } from '../domain/types.js';
import { parseCardCode } from '../lib/cardCode.js';
import { ApiError, asyncHandler } from '../lib/http.js';
import { redeemSchema, verifySchema } from '../schemas.js';
import { redeemCard, resolveCard, verifyCard } from '../services/redeem.js';
import { store } from '../store/memoryStore.js';

export const redeemRouter = Router();

function clientIp(ip: string | undefined) {
  if (!ip) return null;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

/** 校验卡密（只读，不核销）：给前端的「查询卡密状态」使用 */
redeemRouter.post(
  '/verify',
  asyncHandler((req, res) => {
    const body = verifySchema.parse(req.body ?? {});
    const result = verifyCard(body.cardCode, { ip: clientIp(req.ip), account: body.account ?? null });
    res.json({
      usable: result.usable,
      reason: result.reason,
      benefit: result.benefit,
      remainingSeats: result.remainingSeats,
      card: {
        displayCode: result.card.displayCode,
        status: result.card.status,
        statusLabel: CARD_STATUS_LABEL[result.card.status],
        benefitType: result.card.benefitType,
        benefitTypeLabel: BENEFIT_TYPE_LABEL[result.card.benefitType],
        benefitPeriod: result.card.benefitPeriod,
        benefitPeriodLabel: BENEFIT_PERIOD_LABEL[result.card.benefitPeriod],
        groupSize: result.card.groupSize,
        members: result.card.members,
        createdAt: result.card.createdAt,
        expiresAt: result.card.expiresAt,
        usedByUserId: result.card.usedByUserId,
        usedByUserAccount: result.card.usedByUserAccount,
        usedAtDate: result.card.usedAtDate,
      },
    });
  }),
);

/**
 * 核销卡密（供各业务系统调用）。
 * MVP 阶段不鉴权；接入真实业务前请在此处加上 API Key / 内部服务签名校验，
 * 并对同一 IP + 卡密维度做限流，防止暴力遍历。
 */
redeemRouter.post(
  '/',
  asyncHandler((req, res) => {
    const body = redeemSchema.parse(req.body ?? {});
    const result = redeemCard(body.cardCode, {
      userId: body.userId,
      account: body.account,
      ip: clientIp(req.ip),
      dryRun: body.dryRun,
    });
    res.json({
      success: true,
      outcome: result.outcome,
      message: result.message,
      benefit: result.benefit,
      remainingSeats: result.remainingSeats,
      usedAtDate: result.usedAtDate,
      card: {
        id: result.card.id,
        displayCode: result.card.displayCode,
        status: result.card.status,
        benefitType: result.card.benefitType,
        benefitPeriod: result.card.benefitPeriod,
        groupSize: result.card.groupSize,
        members: result.card.members,
        expiresAt: result.card.expiresAt,
        usedByUserId: result.card.usedByUserId,
        usedByUserAccount: result.card.usedByUserAccount,
        usedAtDate: result.card.usedAtDate,
      },
    });
  }),
);

/** 纯格式预校验：前端逐字符输入时即时反馈，不查库不写日志 */
redeemRouter.get(
  '/parse',
  asyncHandler((req, res) => {
    const code = String(req.query.cardCode ?? '');
    if (!code) throw ApiError.badRequest('缺少 cardCode 参数');
    const parsed = parseCardCode(code);
    const exists = parsed.ok ? Boolean(store.getCardByCode(parsed.raw)) : false;
    res.json({ ...parsed, exists });
  }),
);
