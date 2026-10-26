import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { errorHandler } from './lib/http.js';
import { router } from './routes/index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
/** 生产构建产物：apps/web/dist */
const webDist = path.resolve(currentDir, '../../web/dist');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(cors());
  app.use(express.json({ limit: '4mb' }));

  app.use('/api', router);

  // 单机自托管：若前端已构建，则由同一个 Node 进程托管静态站点
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^\/(?!api).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  } else {
    console.warn(`[server] 未找到前端构建产物，仅提供 API：${webDist}`);
  }

  app.use((req: Request, res: Response) => {
    res.status(404).json({ code: 'NOT_FOUND', message: `接口不存在：${req.method} ${req.originalUrl}` });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    errorHandler(err, req, res, next);
  });

  return app;
}
