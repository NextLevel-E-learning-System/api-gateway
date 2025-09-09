import { Router, Request, Response } from 'express'

// Cria um proxy router para um serviço específico. Garantimos que o prefixo do serviço (ex: /auth)
// seja preservado no forwardPath para permitir que o serviço exponha rotas namespaced (ex: /auth/v1/*).
export function proxyRouter(envVar: string, servicePrefix: string) {
  const router = Router()
  const base = process.env[envVar]
  router.all('*', async (req: Request, res: Response) => {
    if (!base) return res.status(500).json({ error: 'upstream_not_configured', upstream: envVar })

    // originalUrl inclui TUDO (ex: /auth/v1/login). req.baseUrl = /auth quando montado em /auth.
    // Alguns cenários (versão compilada antiga / libs) podem usar req.url internamente e perder o prefixo;
    // então reconstruímos de forma defensiva.
    const original = req.originalUrl // sempre completo
    const baseUrl = (req as any).baseUrl || req.baseUrl // path em que o router foi montado
    const relative = req.url // pode estar sem o prefixo

    let forwardPath: string
    if (original.startsWith(`/${servicePrefix}/`)) {
      forwardPath = original // já completo
    } else if (baseUrl && relative && !relative.startsWith(`/${servicePrefix}/`)) {
      // Remonta adicionando prefixo se ele sumiu
      forwardPath = `/${servicePrefix}` + (relative.startsWith('/') ? relative : `/${relative}`)
    } else {
      forwardPath = original || `/${servicePrefix}` + relative // fallback
    }

    // Reescrita apenas para docs e assets swagger.
    const beforeRewrite = forwardPath
    forwardPath = forwardPath.replace(new RegExp(`^/(${servicePrefix})/docs(.*)?$`), '/docs$2')
    forwardPath = forwardPath.replace(
      new RegExp(`^/(${servicePrefix})/(swagger-ui.*|favicon-.*\\.png)$`),
      '/docs/$2'
    )

    const url = base + forwardPath
    ;(req as any).log?.debug(
      {
        original,
        baseUrl,
        relative,
        beforeRewrite,
        forwardPath,
        servicePrefix,
        base,
        upstream: url,
        method: req.method,
      },
      'proxy_request'
    )

    try {
      // Clonar headers originais (exceto hop-by-hop) preservando Authorization
      const headers: Record<string, string> = {}
      for (const [k, v] of Object.entries(req.headers)) {
        if (!v) continue
        const key = k.toLowerCase()
        if (['host', 'connection', 'content-length', 'accept-encoding'].includes(key)) continue
        if (Array.isArray(v)) headers[key] = v.join(',')
        else headers[key] = String(v)
      }
      headers['x-correlation-id'] = (req as any).correlationId
      // Garantir content-type só quando houver body
      if (!headers['content-type'] && req.body && Object.keys(req.body).length) {
        headers['content-type'] = 'application/json'
      }
      if ((req as any).user) {
        headers['x-user-id'] = (req as any).user.sub
        headers['x-user-roles'] = ((req as any).user.roles || []).join(',')
      }
      const hasBody =
        !['GET', 'HEAD'].includes(req.method) && req.body && Object.keys(req.body).length > 0
      const upstream = await fetch(url, {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body) : undefined,
      })
      const text = await upstream.text()
      upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'transfer-encoding') return
        if (key.toLowerCase() === 'set-cookie') {
          if (process.env.LOG_LEVEL === 'debug') {
            // eslint-disable-next-line no-console
            console.debug('[gateway] repassando Set-Cookie do upstream', value)
          }
          // fetch em Node pode combinar múltiplos Set-Cookie — garantimos repasse bruto
          const existing = res.getHeader('Set-Cookie')
          if (existing) {
            const arr: string[] = Array.isArray(existing)
              ? existing.map(e => String(e))
              : [String(existing)]
            arr.push(String(value))
            res.setHeader('Set-Cookie', arr)
          } else {
            res.setHeader('Set-Cookie', String(value))
          }
          return
        }
        res.setHeader(key, value)
      })
      res.status(upstream.status).send(text)
    } catch (e: any) {
      ;(req as any).log?.error({ err: e, upstream: url }, 'proxy_error')
      res.status(502).json({ error: 'bad_gateway', message: e.message })
    }
  })
  return router
}
