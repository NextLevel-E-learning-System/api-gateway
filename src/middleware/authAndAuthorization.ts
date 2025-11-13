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
  token?: string  // ✅ Adicionar token extraído
  log?: {
    debug: (data: object, message: string) => void
    warn: (data: object, message: string) => void
  }
}

// CONFIGURAÇÃO CORRETA DE AUTENTICAÇÃO E AUTORIZAÇÃO
const AUTH_CONFIG = {

  publicRoutes: {
  patterns: [
    '/auth/v1/login',
    '/auth/v1/register',
    '/users/v1/register',
    '/users/v1/reset-password',
    '/auth/v1/reset-password',
    '/users/v1/departamentos',
    '/users/v1/cargos',
  ],
      methods: ['POST', 'PUT', 'PATCH', 'DELETE']
},
  
  // Padrões que requerem ADMIN para CRUD
  adminRequired: {
    patterns: [
      '/users/v1/funcionarios/*/role',    // Gerenciar roles de usuários
      '/courses/v1/categorias',           // Gerenciar categorias
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
      '/courses/v1/*/active',             // Ativar/desativar cursos (INSTRUTOR pode desde que não tenha inscrições - validação no backend)
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
  console.log('[extractToken] Headers recebidos:', {
    authorization: req.header('authorization'),
    cookie: req.headers.cookie,
    hasQuery: !!req.query.access_token
  })

  // 1. Header Authorization
  const auth = req.header('authorization')
  if (auth) {
    const token = auth.replace(/^Bearer\s+/i, '')
    console.log('[extractToken] Token encontrado no Authorization header')
    return token
  }

  // 2. Cookie accessToken
  if (req.headers.cookie) {
    try {
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map(c => {
          const [k, ...v] = c.trim().split('=')
          return [k, decodeURIComponent(v.join('='))]
        })
      )
      console.log('[extractToken] Cookies parseados:', Object.keys(cookies))
      
      if (cookies.accessToken) {
        console.log('[extractToken] Token encontrado no cookie accessToken')
        return cookies.accessToken
      }
    } catch (error) {
      console.error('[extractToken] Erro ao parsear cookies:', error)
    }
  }

  // 3. Query param
  const query = req.query as Record<string, string>
  if (query.access_token) {
    console.log('[extractToken] Token encontrado no query param')
    return query.access_token
  }

  console.log('[extractToken] Nenhum token encontrado')
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
   if (ASSET_PATTERNS.some(pattern => pattern.test(path))) {
    return true
  }
  
  const { patterns, methods } = AUTH_CONFIG.publicRoutes
  return patterns.some(pattern => 
    matchesRoute(pattern, path) && methods.includes(method)
  )
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
  
  console.log(`[authMiddleware] ${method} ${path}`)
  
  // 1. ÚNICA EXCEÇÃO: Rotas realmente públicas (sem token)
  if (isPublicRoute(path, method)) {
    console.log(`[authMiddleware] Rota pública, pulando autenticação`)
    next()
    return
  }
  
  // 2. TODAS as outras rotas precisam de token válido (incluindo logout/refresh)
  const token = extractToken(req)
  
  if (!token) {
    console.log(`[authMiddleware] Token não encontrado para ${path}`)
    userReq.log?.warn({ path, msg: 'auth_missing_header' }, 'Missing Authorization header')
    res.status(401).json({ error: 'missing_authorization_header' })
    return
  }

  console.log(`[authMiddleware] Token encontrado, validando...`)

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
    
    // ✅ Injetar headers para serviços downstream
    res.setHeader('x-user-id', payload.sub)
    res.setHeader('x-user-role', payload.roles || 'FUNCIONARIO')
    
    // ✅ Armazenar token e user no request para o proxy usar
    userReq.user = payload
    userReq.token = token
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