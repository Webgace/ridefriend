// Ficheiro: backend/src/app.ts | Função: bootstrap Express + middleware + rotas (P9)
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from '@lib/env';
import { logger } from '@lib/logger';
import { errorHandler, notFoundHandler } from '@middleware/errorHandler';

import authRoutes from '@routes/auth.routes';
import usersRoutes from '@routes/users.routes';
import contactsRoutes from '@routes/contacts.routes';
import locationsRoutes from '@routes/locations.routes';
import ridesRoutes from '@routes/rides.routes';
import ratingsRoutes from '@routes/ratings.routes';
import notificationsRoutes from '@routes/notifications.routes';
import sosRoutes from '@routes/sos.routes';

/**
 * createApp — factory que devolve uma instância fresca do Express com middleware
 * e rate-limit stores próprios. Importante: os testes de integração chamam isto
 * em `beforeEach` para garantir que o rate-limit não vaza estado entre testes.
 */
export function createApp(): Express {
  const app = express();
  const startedAt = Date.now();

  // Confia no proxy para rate-limit por IP correcto atrás do Nginx.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '256kb' }));
  if (env.nodeEnv !== 'test') {
    app.use(morgan('combined'));
  }

  // Rate limit global: 100 req/min por IP.
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Demasiados pedidos. Tenta novamente em instantes.' },
    }),
  );

  // Rate limit mais apertado para auth (10 req/min).
  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados pedidos de autenticação. Aguarda um minuto.' },
  });

  // Health check público.
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptime: Math.round((Date.now() - startedAt) / 1000),
      version: env.appVersion,
    });
  });

  // Rotas.
  app.use('/auth', authLimiter, authRoutes);
  app.use('/users', usersRoutes);
  app.use('/contacts', contactsRoutes);
  app.use('/locations', locationsRoutes);
  app.use('/rides', ridesRoutes);
  app.use('/ratings', ratingsRoutes);
  app.use('/notifications', notificationsRoutes);
  app.use('/sos', sosRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(env.port, () => {
    logger.info('RideFriend API a ouvir', { port: env.port, env: env.nodeEnv });
  });
}

export default app;
