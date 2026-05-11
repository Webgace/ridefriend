// Ficheiro: backend/src/middleware/asyncHandler.ts | Função: wrapper que encaminha erros async para o errorHandler (P9)
import { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
