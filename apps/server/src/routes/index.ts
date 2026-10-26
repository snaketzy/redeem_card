import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { store } from '../store/memoryStore.js';
import { seedDemoData } from '../store/seed.js';
import { batchesRouter } from './batches.js';
import { cardsRouter } from './cards.js';
import { metaRouter } from './meta.js';
import { redeemRouter } from './redeem.js';
import { logsRouter, statsRouter } from './stats.js';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'redeem-card-server', time: new Date().toISOString() });
});

router.use('/meta', metaRouter);
router.use('/cards', cardsRouter);
router.use('/batches', batchesRouter);
router.use('/redeem', redeemRouter);
router.use('/stats', statsRouter);
router.use('/logs', logsRouter);

/**
 * 演示用：重置内存 Mock 数据并重新灌入种子数据。
 * 接入 MySQL 后删除此路由（或加管理员鉴权）。
 */
router.post(
  '/dev/reset',
  asyncHandler((_req, res) => {
    store.reset();
    const summary = seedDemoData();
    res.json({ ok: true, ...summary });
  }),
);
