// Ficheiro: backend/src/middleware/auth.ts | Função: middleware JWT — valida tokens Supabase (P9)
import { NextFunction, Request, Response } from 'express';
import { jwtVerify, errors as joseErrors } from 'jose';
import { env } from '@lib/env';
import { HttpError } from '@lib/httpError';

export interface AuthUser {
  id: string;
  phone?: string;
  email?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const secret = new TextEncoder().encode(env.supabaseJwtSecret);

/**
 * requireAuth — Bearer JWT (HS256) emitido pelo Supabase Auth.
 * Em caso de falha responde 401 com mensagem em pt-PT.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header('authorization') ?? req.header('Authorization');
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      throw new HttpError(401, 'Token de autenticação em falta.');
    }
    const token = header.slice(7).trim();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      audience: 'authenticated',
    });
    if (!payload.sub) {
      throw new HttpError(401, 'Token inválido (sem sub).');
    }
    req.user = {
      id: String(payload.sub),
      phone: typeof payload.phone === 'string' ? payload.phone : undefined,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    if (
      error instanceof joseErrors.JWTExpired ||
      error instanceof joseErrors.JWTInvalid ||
      error instanceof joseErrors.JWSSignatureVerificationFailed
    ) {
      return next(new HttpError(401, 'Token expirado ou inválido.'));
    }
    next(new HttpError(401, 'Falha de autenticação.'));
  }
}
