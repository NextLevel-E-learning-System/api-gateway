import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { logger } from './config/logger.js'
import { correlationId } from './middleware/correlationId.js'
import { authMiddleware } from './middleware/auth.js'
import { proxyRoutes } from './routes/proxyRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { loadOpenApi } from './config/openapi.js'
// Usa fetch nativo (Node 18+) para evitar dependência adicional
interface RemoteSpecSummary { url: string; title?: string; version?: string; paths?: string[]; error?: string }
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

  app.get('/', (_req, res) =>
    res.json({ message: 'gateway root', docs: '/docs', servicesIndex: '/docs/services' })
  )
  const spec = loadOpenApi('API Gateway')
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec))

  // Agregador dinâmico de specs dos microserviços
  app.get('/docs/services', async (_req, res) => {
    const services = (process.env.SERVICES_OPENAPI || '').split(',').map(s => s.trim()).filter(Boolean)
    if (!services.length) return res.json({ warning: 'Defina SERVICES_OPENAPI com URLs de /openapi.json', aggregated: [] })
    const aggregated: RemoteSpecSummary[] = []
    for (const url of services) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const resp = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = (await resp.json()) as OpenApiSpec
        aggregated.push({ url, title: data.info?.title, version: data.info?.version, paths: Object.keys(data.paths || {}) })
      } catch (err) {
        aggregated.push({ url, error: (err as Error).message })
      }
    }
    res.json({ generatedAt: new Date().toISOString(), count: aggregated.length, aggregated })
  })

  // Spec combinado (merge superficial) - rota experimental
  app.get('/docs/combined.json', async (_req, res) => {
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
