import express from 'express'
import cors from 'cors'
import { logger } from './config/logger.js'
import { correlationId } from './middleware/correlationId.js'
import { authMiddleware } from './middleware/auth.js'
import { proxyRoutes } from './routes/proxyRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'

interface OpenApiSpec { info?: { title?: string; version?: string }; paths?: Record<string, unknown>; components?: { schemas?: Record<string, unknown> } }
export function createServer() {
  const app = express()
  // Aumentar limite para uploads de arquivos (50MB)
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: true }))
  const allowAll = process.env.ALLOW_ALL_ORIGINS === 'true'
  app.use(
    cors({
      origin: allowAll
        ? (origin, cb) => cb(null, true)
        : (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
      credentials: true,
    })
  )
  app.use((req, _res, next) => {
    (req as unknown as { log: typeof logger }).log = logger
    next()
  })
  app.use(correlationId)
  app.use(authMiddleware)

  // Única rota de OpenAPI agregada
  app.get('/docs/swagger', async (_req, res) => {
    const services = (process.env.SERVICES_OPENAPI || '').split(',').map(s => s.trim()).filter(Boolean)
    const base: OpenApiSpec & { openapi: string } = { openapi: '3.0.3', info: { title: 'Aggregated API', version: '1.0.0' }, paths: {}, components: { schemas: {} } }
    for (const url of services) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const resp = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        if (!resp.ok) continue
        const data = (await resp.json()) as OpenApiSpec
        Object.assign(base.paths!, data.paths || {})
        if (data.components?.schemas) {
          for (const [k, v] of Object.entries(data.components.schemas)) {
            if (!base.components!.schemas![k]) base.components!.schemas![k] = v
          }
        }
      } catch { /* ignora erros individuais */ }
    }
  res.json(base)
  })
  app.use(proxyRoutes)
  app.use(errorHandler)
  return app
}
