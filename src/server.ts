import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { logger } from './config/logger.js'
import { correlationId } from './middleware/correlationId.js'
import { authAndAuthorizationMiddleware } from './middleware/authAndAuthorization.js'
import { proxyRoutes } from './routes/proxyRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'

interface OpenApiSpec { 
  info?: { title?: string; version?: string }
  paths?: Record<string, unknown>
  components?: { 
    schemas?: Record<string, unknown>
    securitySchemes?: Record<string, unknown>
  } 
}

export function createServer() {
  const app = express()
  
  // Configuração básica
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: true }))
  
  // CORS
  const allowAll = process.env.ALLOW_ALL_ORIGINS === 'true'
  app.use(cors({
    origin: allowAll
      ? (origin, cb) => cb(null, true)
      : (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
    credentials: true,
  }))
  
  // Middlewares globais
  app.use((req, _res, next) => {
    (req as unknown as { log: typeof logger }).log = logger
    next()
  })
  app.use(correlationId)
  app.use(authAndAuthorizationMiddleware) // ✅ UM ÚNICO MIDDLEWARE PARA TUDO!

  // Documentação Swagger UI
  app.use('/docs', swaggerUi.serve)
  app.get('/docs', swaggerUi.setup(null, {
    swaggerOptions: { url: '/openapi.json' }
  }))

  // Agregação de especificações OpenAPI
  app.get('/openapi.json', async (_req, res) => {
    const services = (process.env.SERVICES_OPENAPI || '').split(',')
      .map(s => s.trim())
      .filter(Boolean)
    
    const aggregated: OpenApiSpec & { openapi: string } = {
      openapi: '3.0.3',
      info: { title: 'NextLevel E-learning API', version: '1.0.0' },
      paths: {},
      components: { 
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
    
    // Buscar e agregar specs de todos os serviços
    for (const serviceUrl of services) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(serviceUrl, { signal: controller.signal })
        clearTimeout(timeout)
        
        if (!response.ok) continue
        
        const serviceSpec = await response.json() as OpenApiSpec
        
        // Mesclar paths
        Object.assign(aggregated.paths!, serviceSpec.paths || {})
        
        // Mesclar schemas evitando conflitos
        if (serviceSpec.components?.schemas) {
          for (const [name, schema] of Object.entries(serviceSpec.components.schemas)) {
            if (!aggregated.components!.schemas![name]) {
              aggregated.components!.schemas![name] = schema
            }
          }
        }
        
        // Mesclar securitySchemes
        if (serviceSpec.components?.securitySchemes) {
          for (const [name, scheme] of Object.entries(serviceSpec.components.securitySchemes)) {
            if (!aggregated.components!.securitySchemes![name]) {
              aggregated.components!.securitySchemes![name] = scheme
            }
          }
        }
      } catch {
        // Ignorar erros de serviços individuais
      }
    }
    
    res.json(aggregated)
  })

  // Rotas dos serviços
  app.use(proxyRoutes)
  
  // Error handler
  app.use(errorHandler)
  
  return app
}
