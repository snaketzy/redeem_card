import { Router } from 'express';
import { z } from 'zod';
import { LOG_ACTION_LABEL, type LogAction } from '../domain/types.js';
import { asyncHandler } from '../lib/http.js';
import { store } from '../store/memoryStore.js';

export const statsRouter = Router();
export const logsRouter = Router();

statsRouter.get(
  '/overview',
  asyncHandler((_req, res) => {
    res.json(store.overview());
  }),
);

const logQuerySchema = z.object({
  cardCode: z.string().optional(),
  action: z.string().optional(),
  success: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

logsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const query = logQuerySchema.parse(req.query);
    const action =
      query.action && query.action in LOG_ACTION_LABEL ? (query.action as LogAction) : undefined;
    res.json(
      store.listLogs({
        cardCode: query.cardCode || undefined,
        action,
        success: query.success === undefined ? undefined : query.success === 'true',
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
  }),
);
