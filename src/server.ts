import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { logger } from './config/logger.js';
import { correlationId } from './middleware/correlationId.js';
import { authMiddleware } from './middleware/auth.js';
import { proxyRoutes } from './routes/proxyRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { loadOpenApi } from './config/openapi.js';
export function createServer(){
	const app=express();
	// Aumentar limite para uploads de arquivos (50MB)
	app.use(express.json({ limit: '50mb' }));
	app.use(express.urlencoded({ limit: '50mb', extended: true }));
	const allowAll = process.env.ALLOW_ALL_ORIGINS === 'true';
	app.use(cors({
		origin: allowAll ? (origin, cb) => cb(null, true) : (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
		credentials: true
	}));
	app.use((req,_res,next)=>{ (req as any).log=logger; next(); });
	app.use(correlationId);
	app.use(authMiddleware);

	app.get('/', (_req,res)=> res.json({ message:'gateway root', docs:'/docs', servicesIndex:'/docs/services' }));
	const spec=loadOpenApi('API Gateway');
	app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
	app.use(proxyRoutes);
	app.use(errorHandler);
	return app;
}