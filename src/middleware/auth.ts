import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

// Rotas públicas explícitas (prefixos exatos) e padrões (regex) que não exigem Authorization
const publicStarts = [
	'/auth/v1/login',
	'/auth/v1/register',
	'/auth/v1/refresh',
	'/auth/v1/logout'
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

	// Logout bypass imediato (antes de qualquer outra lógica) — sempre segue
	if (path === '/auth/v1/logout') {
		(req as any).log?.debug({ path, msg:'logout_bypass_pre' }, 'Bypassing auth for logout (early)');
		return next();
	}

	// Bypass para docs e assets swagger de qualquer serviço
	const isSwaggerAsset = /(swagger-ui|favicon-\d+x\d+\.png|swagger-ui\.css)/.test(path);
	const isDocs = /\/docs(\/|$)/.test(path);
	if (isSwaggerAsset || isDocs) return next();

	// (já tratado no early bypass)

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
		const secret = process.env.JWT_SECRET || 'dev-secret';
		const key = createHash('sha256').update(secret).digest();
		const payload = jwt.verify(token, key) as any;
		res.setHeader('x-user-id', payload.sub);
		res.setHeader('x-user-roles', (payload.roles || []).join(','));
		(req as any).user = payload;
		return next();
		} catch {
			(req as any).log?.warn({ path, msg:'auth_invalid_token' }, 'Invalid token');
			return res.status(401).json({ error: 'invalid_token' });
	}
}
