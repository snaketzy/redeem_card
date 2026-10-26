import { Router } from 'express';
import { z } from 'zod';
import { CARD_STATUS, type BenefitType } from '../domain/types.js';
import { ApiError, asyncHandler } from '../lib/http.js';
import { benefitTypeSchema } from '../schemas.js';
import { store } from '../store/memoryStore.js';

export const batchesRouter = Router();

const listQuerySchema = z.object({
  keyword: z.string().optional(),
  benefitType: benefitTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

batchesRouter.get(
  '/',
  asyncHandler((req, res) => {
    const query = listQuerySchema.parse(req.query);
    res.json(store.listBatches({ ...query, benefitType: query.benefitType as BenefitType | undefined }));
  }),
);

batchesRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const batch = store.getBatch(String(req.params.id));
    if (!batch) throw ApiError.notFound('批次不存在');
    res.json({ ...batch, stats: store.batchStats(batch.id) });
  }),
);

/** 整批冻结 / 作废：默认只影响未使用的卡，已核销的卡不会被改动 */
batchesRouter.post(
  '/:id/status',
  asyncHandler((req, res) => {
    const body = z
      .object({
        status: z.union([z.literal(0), z.literal(2)]),
        includeUsed: z.boolean().default(false),
      })
      .parse(req.body ?? {});

    const batch = store.getBatch(String(req.params.id));
    if (!batch) throw ApiError.notFound('批次不存在');

    const onlyFrom = body.status === CARD_STATUS.UNUSED ? [CARD_STATUS.FROZEN] : body.includeUsed ? undefined : [CARD_STATUS.UNUSED];
    const changed = store.updateCardsByBatch(batch.id, body.status, onlyFrom);

    store.addLog({
      cardId: null,
      code: '-',
      displayCode: '-',
      action: body.status === CARD_STATUS.FROZEN ? 'freeze' : 'unfreeze',
      success: true,
      message: `批次 ${batch.batchNo} 整批${body.status === CARD_STATUS.FROZEN ? '冻结' : '解冻'} ${changed} 张卡`,
      userId: null,
      account: 'admin',
      ip: req.ip ?? null,
    });

    res.json({ changed, stats: store.batchStats(batch.id) });
  }),
);
