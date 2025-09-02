import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import pino from 'pino';
import { v4 as uuid } from 'uuid';
import * as jwt from 'jsonwebtoken';
// Import ESM com extensão explícita para Node resolver corretamente em produção
import { proxyRouter } from './upstreamProxy.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export function createServer() {
  const app = express();
  app.use(express.json());
  app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || '*').split(','), credentials: true }));
  app.use((req, _res, next) => { (req as any).log = logger; logger.level === 'debug' && logger.debug({ method: req.method, url: req.url }, 'request'); next(); });

  // Correlation ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const cid = req.header('x-correlation-id') || uuid();
    (req as any).correlationId = cid;
    res.setHeader('x-correlation-id', cid);
    next();
  });

  // JWT Auth middleware (skips public paths)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const publicPaths: string[] = ['/auth/v1/login', '/auth/v1/register', '/health/live', '/health/ready'];
    if (publicPaths.includes(req.path)) return next();
    const auth = req.header('authorization');
    if (!auth) return res.status(401).json({ error: 'missing_authorization_header' });
    const token = auth.replace(/^Bearer\s+/i, '');
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      res.setHeader('x-user-id', payload.sub);
      res.setHeader('x-user-roles', (payload.roles || []).join(','));
      (req as any).user = payload;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'invalid_token' });
    }
  });

  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', (_req, res) => res.json({ status: 'ok' }));

  // Upstream proxy simulation (placeholder)
  app.use('/auth', proxyRouter('AUTH_SERVICE_BASE_URL'));
  app.use('/users', proxyRouter('USER_SERVICE_BASE_URL'));
  app.use('/notifications', proxyRouter('NOTIFICATION_SERVICE_BASE_URL'));
  app.use('/courses', proxyRouter('COURSE_SERVICE_BASE_URL'));
  app.use('/assessments', proxyRouter('ASSESSMENT_SERVICE_BASE_URL'));
  app.use('/gamification', proxyRouter('GAMIFICATION_SERVICE_BASE_URL'));
  app.use('/progress', proxyRouter('PROGRESS_SERVICE_BASE_URL'));

  // Fallback
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}