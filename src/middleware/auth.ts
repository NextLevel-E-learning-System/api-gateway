import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createHash } from 'crypto'

// Rotas públicas do sistema
const PUBLIC_ROUTES = [
  // Auth service
  '/auth/v1/login',
  '/auth/v1/reset-password',
  // User service
  '/users/v1/departamentos',
  '/users/v1/cargos',
  '/users/v1/funcionarios/register',
  '/users/v1/funcionarios/reset-password',
  // Gateway
  '/openapi.json',
  '/'
]

// Padrões de rotas que sempre são públicas
const PUBLIC_PATTERNS = [
  /^\/favicon\.ico$/,
  /\/docs($|\/)/,
  /swagger-ui/,
  /favicon-.*\.png$/
]

interface JwtPayload {
  sub: string
  roles?: string[]
  [key: string]: unknown
}

interface RequestWithUser extends Request {
  user?: JwtPayload
  log?: {
    debug: (data: object, message: string) => void
    warn: (data: object, message: string) => void
  }
}

function extractToken(req: Request): string | null {
  // 1. Header Authorization
  const auth = req.header('authorization')
  if (auth) return auth.replace(/^Bearer\s+/i, '')

  // 2. Cookie accessToken
  if (req.headers.cookie) {
    try {
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map(c => {
          const [k, ...v] = c.trim().split('=')
          return [k, decodeURIComponent(v.join('='))]
        })
      )
      if (cookies.accessToken) return cookies.accessToken
    } catch {
      // ignore parse errors
    }
  }

  // 3. Query param
  const query = req.query as Record<string, string>
  if (query.access_token) return query.access_token

  return null
}

function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  const key = createHash('sha256').update(secret).digest()
  return jwt.verify(token, key) as JwtPayload
}

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path.startsWith(route)) ||
         PUBLIC_PATTERNS.some(pattern => pattern.test(path))
}

function handleRefreshRoute(req: RequestWithUser, res: Response, next: NextFunction): void {
  const token = extractToken(req)
  
  if (!token) {
    res.status(401).json({ error: 'authorization_required_for_refresh' })
    return
  }

  try {
    // Tentar validar token normalmente
    const payload = verifyToken(token)
    res.setHeader('x-user-id', payload.sub)
    res.setHeader('x-user-roles', (payload.roles || []).join(','))
    req.user = payload
    next()
  } catch (e) {
    const error = e as Error
    // Se token expirou, ainda extrair dados para validação no service
    if (error.name === 'TokenExpiredError') {
      try {
        const decoded = jwt.decode(token) as JwtPayload
        if (decoded?.sub) {
          res.setHeader('x-user-id', decoded.sub)
          res.setHeader('x-user-roles', (decoded.roles || []).join(','))
          req.user = decoded
          next()
          return
        }
      } catch {
        // ignore decode errors
      }
    }
    res.status(401).json({ error: 'invalid_token' })
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userReq = req as RequestWithUser
  const path = req.originalUrl.split('?')[0]

  // Bypass para documentação e assets do Swagger
  if (isPublicRoute(path)) {
    next()
    return
  }

  // Tratamento especial para refresh: permite token expirado
  if (req.method === 'POST' && path === '/auth/v1/refresh') {
    handleRefreshRoute(userReq, res, next)
    return
  }

  const token = extractToken(req)
  
  if (!token) {
    userReq.log?.warn({ path, msg: 'auth_missing_header' }, 'Missing Authorization header')
    res.status(401).json({ error: 'missing_authorization_header' })
    return
  }

  try {
    const payload = verifyToken(token)
    res.setHeader('x-user-id', payload.sub)
    res.setHeader('x-user-roles', (payload.roles || []).join(','))
    userReq.user = payload
    next()
  } catch (e) {
    const error = e as Error
    userReq.log?.warn(
      { path, msg: 'auth_invalid_token', errName: error.name, errMessage: error.message },
      'Invalid token'
    )
    res.status(401).json({ error: 'invalid_token' })
  }
}
