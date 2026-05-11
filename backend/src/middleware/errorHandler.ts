// Ficheiro: backend/src/middleware/errorHandler.ts | Função: handler global de erros (mensagens pt-PT) (P9)
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '@lib/httpError';
import { logger } from '@lib/logger';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Rota não encontrada.' });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Dados inválidos.',
      details: err.flatten(),
    });
    return;
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logger.error('HttpError 5xx', { path: req.path, message: err.message });
    }
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  const message = err instanceof Error ? err.message : 'Erro inesperado.';
  logger.error('Erro não tratado', { path: req.path, method: req.method, message });
  res.status(500).json({ error: 'Erro interno do servidor.' });
}
