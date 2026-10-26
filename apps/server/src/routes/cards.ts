import { Router } from 'express';
import { CARD_STATUS } from '../domain/types.js';
import { buildCardsCsv, buildCardsTxt } from '../lib/csv.js';
import { ApiError, asyncHandler } from '../lib/http.js';
import { exportSchema, generateSchema, listCardsQuerySchema, parseCardQuery, updateStatusSchema } from '../schemas.js';
import { generateCards } from '../services/generator.js';
import { store } from '../store/memoryStore.js';

export const cardsRouter = Router();

function batchNoMap() {
  const map = new Map<string, string>();
  const { items } = store.listBatches({ page: 1, pageSize: 10000 });
  for (const batch of items) map.set(batch.id, batch.batchNo);
  return map;
}

/** 批量生成卡密 */
cardsRouter.post(
  '/generate',
  asyncHandler((req, res) => {
    const input = generateSchema.parse(req.body ?? {});
    const result = generateCards({
      benefitType: input.benefitType,
      benefitPeriod: input.benefitPeriod,
      quantity: input.quantity,
      batchName: input.batchName ?? null,
      validityMode: input.validityMode,
      validityDays: input.validityDays ?? null,
      expiresAt: input.expiresAt ?? null,
      remark: input.remark ?? null,
      groupSize: input.groupSize,
      createdBy: 'admin',
    });

    res.status(201).json({
      batch: result.batch,
      total: result.cards.length,
      retries: result.retries,
      // 展示用预览限制，完整数据请走导出接口
      preview: result.cards.slice(0, 500),
    });
  }),
);

/** 卡密列表（筛选 + 分页） */
cardsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const raw = listCardsQuerySchema.parse(req.query);
    const query = parseCardQuery(raw);
    const page = store.listCards(query);
    res.json({ ...page, batchNos: Object.fromEntries(batchNoMap()) });
  }),
);

/** 导出卡密（CSV / TXT） */
cardsRouter.post(
  '/export',
  asyncHandler((req, res) => {
    const body = exportSchema.parse(req.body ?? {});
    const filters = body.filters ?? {};
    const raw = listCardsQuerySchema.partial().parse(filters);

    let cards;
    if (body.ids?.length) {
      cards = body.ids
        .map((id) => store.getCardById(id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));
    } else {
      const query = parseCardQuery({
        page: 1,
        pageSize: 20000,
        ...raw,
      } as ReturnType<typeof listCardsQuerySchema.parse>);
      cards = store.listCards(query).items;
    }

    if (cards.length === 0) {
      throw ApiError.badRequest('当前筛选条件下没有可导出的卡密');
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
    const content = body.format === 'txt' ? buildCardsTxt(cards) : buildCardsCsv(cards, batchNoMap());
    const filename = `redeem-cards-${stamp}.${body.format}`;
    res.setHeader('Content-Type', body.format === 'txt' ? 'text/plain; charset=utf-8' : 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Total-Count', String(cards.length));
    res.send(content);
  }),
);

/** 批量修改状态：冻结(2) / 解冻(0) */
cardsRouter.patch(
  '/status',
  asyncHandler((req, res) => {
    const body = updateStatusSchema.parse(req.body ?? {});
    // 解冻只允许从冻结态恢复；冻结只允许从冻结除外的状态进入
    const onlyFrom = body.onlyFrom ?? (body.status === CARD_STATUS.UNUSED ? [CARD_STATUS.FROZEN] : [CARD_STATUS.UNUSED, CARD_STATUS.USED]);
    const changed = store.updateCardStatus(body.ids, body.status, onlyFrom);

    const action = body.status === CARD_STATUS.FROZEN ? 'freeze' : body.status === CARD_STATUS.UNUSED ? 'unfreeze' : 'void';
    store.addLog({
      cardId: null,
      code: '-',
      displayCode: '-',
      action,
      success: true,
      message: `批量${action === 'freeze' ? '冻结' : action === 'unfreeze' ? '解冻' : '置为已使用'} ${changed} 张卡（命中 ${body.ids.length} 张）`,
      userId: null,
      account: 'admin',
      ip: req.ip ?? null,
    });

    res.json({ changed, requested: body.ids.length });
  }),
);

/** 卡密详情 */
cardsRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const card = store.getCardById(String(req.params.id));
    if (!card) throw ApiError.notFound('卡密不存在');
    const batch = store.getBatch(card.batchId);
    res.json({ ...card, batchNo: batch?.batchNo ?? null, batchName: batch?.name ?? null });
  }),
);
