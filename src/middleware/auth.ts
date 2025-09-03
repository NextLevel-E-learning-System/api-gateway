import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

// Rotas públicas explícitas (prefixos exatos) e padrões (regex) que não exigem Authorization
const publicStarts = [
	'/auth/v1/login',
	'/auth/v1/register',
	'/health/live',
	'/health/ready'
];
const publicPatterns = [
	/^\/$/,                 // raiz
	/^\/favicon\.ico$/,    // favicon raiz
		/\/docs($|\/)/,        // qualquer coisa contendo /docs (inclusive /docs/services)
	/swagger-ui/,           // assets swagger
	/favicon-.*\.png$/      // favicons swagger
];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
	const path = req.originalUrl.split('?')[0];

	// Bypass para docs e assets swagger de qualquer serviço
	const isSwaggerAsset = /(swagger-ui|favicon-\d+x\d+\.png|swagger-ui\.css)/.test(path);
	const isDocs = /\/docs(\/|$)/.test(path);
	if (isSwaggerAsset || isDocs) return next();

	if (publicStarts.some(p => path.startsWith(p)) || publicPatterns.some(r => r.test(path))) {
		return next();
	}
	const auth = req.header('authorization');
		if (!auth) {
			(req as any).log?.warn({ path, msg:'auth_missing_header' }, 'Missing Authorization header');
			return res.status(401).json({ error: 'missing_authorization_header' });
		}
	const token = auth.replace(/^Bearer\s+/i, '');
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
		res.setHeader('x-user-id', payload.sub);
		res.setHeader('x-user-roles', (payload.roles || []).join(','));
		(req as any).user = payload;
		return next();
		} catch {
			(req as any).log?.warn({ path, msg:'auth_invalid_token' }, 'Invalid token');
			return res.status(401).json({ error: 'invalid_token' });
	}
}
