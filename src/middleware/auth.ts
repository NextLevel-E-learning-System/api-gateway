import { Request, Response, NextFunction } from 'express'
// jsonwebtoken é CommonJS; usar default import e acessar verify via objeto para evitar erros em ESM.
import jwt from 'jsonwebtoken'
import { createHash } from 'crypto'

// Rotas públicas explícitas (prefixos exatos) e padrões (regex) que não exigem Authorization
const publicStarts = [
  '/auth/v1/login',
  '/auth/v1/register',
  '/auth/v1/reset-password',
  '/openapi.json', // spec agregada do gateway
]
const publicPatterns = [
  /^\/$/, // raiz
  /^\/favicon\.ico$/, // favicon raiz
  /\/docs($|\/)/, // qualquer coisa contendo /docs (inclusive /docs/services)
  /swagger-ui/, // assets swagger
  /favicon-.*\.png$/, // favicons swagger
]

// Função especial para validar refresh: permite tokens expirados mas exige presença
function handleRefreshAuth(req: Request, res: Response, next: NextFunction) {
  let auth = req.header('authorization')
  
  // Fallback: cookie accessToken
  if (!auth && req.headers.cookie) {
    try {
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map(c => {
          const [k, ...v] = c.trim().split('=')
          return [k, decodeURIComponent(v.join('='))]
        })
      )
      if (cookies.accessToken) {
        auth = `Bearer ${cookies.accessToken}`
      }
    } catch (_e) {
      /* ignore parse errors */
    }
  }

  if (!auth) {
    return res.status(401).json({ error: 'authorization_required_for_refresh' })
  }

  const token = auth.replace(/^Bearer\s+/i, '')
  
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret'
    const key = createHash('sha256').update(secret).digest()
    const anyJwt: any = jwt as any
    const verifyFn = anyJwt.verify || (anyJwt.default && anyJwt.default.verify)
    
    // Tentar validar token normalmente
    const payload = verifyFn(token, key) as any
    res.setHeader('x-user-id', payload.sub)
    res.setHeader('x-user-roles', (payload.roles || []).join(','))
    ;(req as any).user = payload
    return next()
    
  } catch (e: any) {
    // Se token expirou, ainda assim extrair dados para validação no service
    if (e?.name === 'TokenExpiredError') {
      try {
        const decoded: any = jwt.decode(token)
        if (decoded && decoded.sub) {
          res.setHeader('x-user-id', decoded.sub)
          res.setHeader('x-user-roles', (decoded.roles || []).join(','))
          ;(req as any).user = decoded
          return next()
        }
      } catch (decodeError) {
        return res.status(401).json({ error: 'invalid_token_format' })
      }
    }
    
    return res.status(401).json({ error: 'invalid_token' })
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.originalUrl.split('?')[0]

  // Logout agora exige Authorization (sem bypass)

  // Bypass para docs e assets swagger de qualquer serviço
  const isSwaggerAsset = /(swagger-ui|favicon-\d+x\d+\.png|swagger-ui\.css)/.test(path)
  const isDocs = /\/docs(\/|$)/.test(path)
  if (isSwaggerAsset || isDocs) return next()

  // (já tratado no early bypass)

  // Rotas públicas específicas do user-service: departamentos e cargos
  if (req.method === 'GET' && (path === '/users/v1/departmentos' || path === '/users/v1/cargos')) {
    return next()
  }

  // Tratamento especial para refresh: exige token mas permite expirado
  if (req.method === 'POST' && path === '/auth/v1/refresh') {
    return handleRefreshAuth(req, res, next)
  }

  if (publicStarts.some(p => path.startsWith(p)) || publicPatterns.some(r => r.test(path))) {
    return next()
  }
  let auth = req.header('authorization')
  // Fallback: cookie accessToken
  if (!auth && req.headers.cookie) {
    try {
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map(c => {
          const [k, ...v] = c.trim().split('=')
          return [k, decodeURIComponent(v.join('='))]
        })
      )
      if (cookies.accessToken) {
        auth = `Bearer ${cookies.accessToken}`
      }
    } catch (_e) {
      /* ignore parse errors */
    }
  }
  // Fallback: query param ?access_token=
  if (!auth && (req as any).query?.access_token) {
    auth = `Bearer ${(req as any).query.access_token}`
  }
  ;(req as any).log?.debug(
    {
      path,
      hasAuthHeader: !!req.header('authorization'),
      usedCookie: !!req.headers.cookie,
      authSnippet: auth?.substring(0, 25),
    },
    'auth_header_received'
  )
  if (!auth) {
    ;(req as any).log?.warn({ path, msg: 'auth_missing_header' }, 'Missing Authorization header')
    return res.status(401).json({ error: 'missing_authorization_header' })
  }
  const token = auth.replace(/^Bearer\s+/i, '')
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret'
    const key = createHash('sha256').update(secret).digest()
    const anyJwt: any = jwt as any
    const verifyFn = anyJwt.verify || (anyJwt.default && anyJwt.default.verify)
    if (typeof verifyFn !== 'function') {
      throw new TypeError('jsonwebtoken_verify_not_function')
    }
    const payload = verifyFn(token, key) as any
    res.setHeader('x-user-id', payload.sub)
    res.setHeader('x-user-roles', (payload.roles || []).join(','))
    ;(req as any).user = payload
    return next()
  } catch (e: any) {
    ;(req as any).log?.warn(
      { path, msg: 'auth_invalid_token', errName: e?.name, errMessage: e?.message },
      'Invalid token'
    )
    return res.status(401).json({ error: 'invalid_token' })
  }
}
