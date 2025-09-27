import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createHash } from 'crypto'

interface JwtPayload {
  sub: string
  roles?: string  // ✅ SINGULAR! Cada usuário tem 1 role
  [key: string]: unknown
}

interface RequestWithUser extends Request {
  user?: JwtPayload
  log?: {
    debug: (data: object, message: string) => void
    warn: (data: object, message: string) => void
  }
}

// CONFIGURAÇÃO CORRETA DE AUTENTICAÇÃO E AUTORIZAÇÃO
const AUTH_CONFIG = {
  // ÚNICAS rotas REALMENTE públicas (sem header Authorization)
  publicRoutes: [
    'POST /auth/v1/login',                       // Login
    'POST /auth/v1/register',                    // Registro (auth-service)
    'POST /users/v1/register',     // Registro
    'POST /users/v1/reset-password', 
    'POST /auth/v1/reset-password',
    'GET /users/v1/departamentos',              // Lista departamentos
    'GET /users/v1/cargos',                     // Lista cargos
  ],
  
  // Padrões que requerem ADMIN para CRUD
  adminRequired: {
    patterns: [
      '/users/v1/funcionarios/*/role',    // Gerenciar roles de usuários
      '/courses/v1/categorias',           // Gerenciar categorias
      '/courses/v1/*/active',             // Ativar/desativar cursos
      '/gamification/v1/badges',          // Gerenciar badges
      '/notifications/v1/templates',      // Gerenciar templates
      '/notifications/v1/filas',          // Gerenciar filas
      '/notifications/v1/notificacoes'    // Enviar notificações manuais
    ],
    methods: [ 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  
  // Padrões que requerem ADMIN para CRUD
  gerenteRequired: {
    patterns: [
      '/users/v1/funcionarios/departamento',
      '/courses/v1/categorias',           // Gerenciar categorias
      '/users/v1/funcionarios/*/role',    // Gerenciar roles de usuários
      '/reports/departamento',        // Relatórios departamentais
    ],
    methods: [  'POST', 'PUT', 'PATCH', 'DELETE']
  },

  // Padrões que requerem INSTRUTOR ou ADMIN para CRUD
  instructorRequired: {
    patterns: [
      '/courses/v1',                      // Criar/editar cursos
      '/courses/v1/*/duplicar',           // Duplicar cursos
      '/courses/v1/*/modulos',            // Gerenciar módulos
      '/courses/v1/modulos/*/materiais',  // Gerenciar materiais
      '/assessments/v1',                  // Criar/editar avaliações
      '/assessments/v1/*/questions',      // Gerenciar questões
      '/assessments/v1/questions/*/alternatives', // Gerenciar alternativas
      '/assessments/v1/attempts/*/dissertative',  // Visualizar dissertativas
      '/assessments/v1/attempts/*/review' // Revisar tentativas
    ],
    methods: ['POST', 'PUT', 'PATCH', 'DELETE']
  }
}

// Padrões para assets e documentação
const ASSET_PATTERNS = [
  /^\/favicon\.ico$/,
  /^\/openapi\.json$/,  // ✅ OpenAPI spec público
  /\/docs($|\/)/,
  /swagger-ui/,
  /favicon-.*\.png$/
]

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

function matchesRoute(pattern: string, actual: string): boolean {
  const escaped = pattern
    .replace(/\//g, '\\/')
    .replace(/\*/g, '[^\\/]*')
  
  const regex = new RegExp(`^${escaped}$`)
  return regex.test(actual)
}

function isPublicRoute(path: string, method: string): boolean {
  // Verificar assets primeiro (favicon, docs, etc.)
  if (ASSET_PATTERNS.some(pattern => pattern.test(path))) {
    return true
  }
  
  // Verificar as ÚNICAS 3 rotas realmente públicas
  const routeKey = `${method} ${path}`
  return AUTH_CONFIG.publicRoutes.includes(routeKey)
}

function requiresAdmin(path: string, method: string): boolean {
  const { patterns, methods } = AUTH_CONFIG.adminRequired
  return patterns.some(pattern => 
    matchesRoute(pattern, path) && methods.includes(method)
  )
}

function requiresInstructor(path: string, method: string): boolean {
  const { patterns, methods } = AUTH_CONFIG.instructorRequired
  return patterns.some(pattern => 
    matchesRoute(pattern, path) && methods.includes(method)
  )
}

function requiresGerente(path: string, method: string): boolean {
  // GERENTE pode fazer algumas operações específicas
  const { patterns, methods } = AUTH_CONFIG.gerenteRequired
   return patterns.some(pattern => 
    matchesRoute(pattern, path) && methods.includes(method)
  )
}

// MIDDLEWARE UNIFICADO SIMPLES - AUTENTICAÇÃO + AUTORIZAÇÃO
export function authAndAuthorizationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userReq = req as RequestWithUser
  const path = req.originalUrl.split('?')[0]
  const method = req.method
  
  // 1. ÚNICA EXCEÇÃO: Rotas realmente públicas (sem token)
  if (isPublicRoute(path, method)) {
    next()
    return
  }
  
  // 2. TODAS as outras rotas precisam de token válido (incluindo logout/refresh)
  const token = extractToken(req)
  
  if (!token) {
    userReq.log?.warn({ path, msg: 'auth_missing_header' }, 'Missing Authorization header')
    res.status(401).json({ error: 'missing_authorization_header' })
    return
  }

  let payload: JwtPayload
  try {
    // Para refresh, permitir token expirado
    if (method === 'POST' && path === '/auth/v1/refresh') {
      try {
        payload = verifyToken(token)
      } catch (e) {
        const error = e as Error
        if (error.name === 'TokenExpiredError') {
          const decoded = jwt.decode(token) as JwtPayload
          if (decoded?.sub) {
            payload = decoded
          } else {
            throw error
          }
        } else {
          throw error
        }
      }
    } else {
      // Para todas as outras rotas, token deve ser válido
      payload = verifyToken(token)
    }
    
    res.setHeader('x-user-id', payload.sub)
    res.setHeader('x-user-role', payload.roles || 'ALUNO')
    
    userReq.user = payload
  } catch (e) {
    const error = e as Error
    userReq.log?.warn(
      { path, msg: 'auth_invalid_token', errName: error.name, errMessage: error.message },
      'Invalid token'
    )
    res.status(401).json({ error: 'invalid_token' })
    return
  }
  
  // 3. AUTORIZAÇÃO - Verificar permissões para CRUD
  const userRole = payload.roles
  
  // Requer ADMIN para estas operações?
  if (requiresAdmin(path, method)) {
    if (userRole !== 'ADMIN') {
      res.status(403).json({ 
        error: 'insufficient_permissions',
        required: 'ADMIN',
        current: userRole,
        message: 'Esta operação requer privilégios de administrador'
      })
      return
    }
  }
  
  // Requer INSTRUTOR para estas operações?
  else if (requiresInstructor(path, method)) {
    if (userRole !== 'INSTRUTOR' && userRole !== 'ADMIN') {
      res.status(403).json({ 
        error: 'insufficient_permissions',
        required: 'INSTRUTOR ou ADMIN',
        current: userRole,
        message: 'Esta operação requer privilégios de instrutor ou administrador'
      })
      return
    }
  }
  
  // Requer GERENTE para estas operações?
  else if (requiresGerente(path, method)) {
    if (userRole !== 'GERENTE' && userRole !== 'ADMIN') {
      res.status(403).json({ 
        error: 'insufficient_permissions',
        required: 'GERENTE ou ADMIN',
        current: userRole,
        message: 'Esta operação requer privilégios de gerente ou administrador'
      })
      return
    }
  }
  
  // 4. Usuário autenticado pode acessar tudo que não tem restrição específica
  next()
}