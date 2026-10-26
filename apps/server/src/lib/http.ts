import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

/** 业务异常：带 HTTP 状态码与机器可读 code */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: unknown;

  constructor(status: number, code: string, message: string, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }

  static badRequest(message: string, detail?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, detail);
  }

  static notFound(message: string) {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, detail?: unknown) {
    return new ApiError(409, 'CONFLICT', message, detail);
  }

  static gone(message: string) {
    return new ApiError(410, 'EXPIRED', message);
  }

  static forbidden(message: string) {
    return new ApiError(403, 'FORBIDDEN', message);
  }
}

/** 包装 async handler，让抛出的异常统一进入错误中间件 */
export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ code: err.code, message: err.message, detail: err.detail });
    return;
  }

  if (err instanceof ZodError) {
    const first = err.issues[0];
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: `参数校验失败：${first?.path.join('.') || 'body'} ${first?.message || ''}`.trim(),
      detail: err.issues,
    });
    return;
  }

  console.error('[unhandled]', err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: err instanceof Error ? err.message : '服务器内部错误',
  });
}
