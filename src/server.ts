import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { logger } from './config/logger.js';
import { correlationId } from './middleware/correlationId.js';
import { authMiddleware } from './middleware/auth.js';
import { healthRouter } from './routes/healthRoutes.js';
import { proxyRoutes } from './routes/proxyRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { loadOpenApi } from './config/openapi.js';
export function createServer(){ const app=express(); app.use(express.json()); app.use(cors({ origin:(process.env.ALLOWED_ORIGINS||'*').split(','), credentials:true })); app.use((req,_res,next)=>{ (req as any).log=logger; next(); }); app.use(correlationId); app.use(authMiddleware); const spec=loadOpenApi('API Gateway'); app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec)); app.use(healthRouter); app.use(proxyRoutes); app.use(errorHandler); return app; }