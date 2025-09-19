import { Router, Request, Response } from 'express'

interface RequestWithUser extends Request {
  user?: { sub: string; role?: string }
  log?: {
    debug: (data: object, message: string) => void
    error: (data: object, message: string) => void
  }
  correlationId?: string
}

export function proxyRouter(envVar: string, servicePrefix: string) {
  const router = Router()
  const baseUrl = process.env[envVar]
  
  router.all('*', async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser
    
    if (!baseUrl) {
      res.status(500).json({ error: 'upstream_not_configured', upstream: envVar })
      return
    }

    // Construir o path completo preservando o prefixo do serviço
    let forwardPath = req.originalUrl
    
    // Reescrever apenas rotas de documentação
    forwardPath = forwardPath.replace(
      new RegExp(`^/(${servicePrefix})/docs(.*)?$`), 
      '/docs$2'
    )
    forwardPath = forwardPath.replace(
      new RegExp(`^/(${servicePrefix})/(swagger-ui.*|favicon-.*\\.png)$`),
      '/docs/$2'
    )

    const upstreamUrl = baseUrl + forwardPath

    try {
      // Preparar headers
      const headers: Record<string, string> = {}
      
      // Copiar headers relevantes (excluindo hop-by-hop headers)
      for (const [key, value] of Object.entries(req.headers)) {
        if (!value) continue
        
        const headerKey = key.toLowerCase()
        const hopByHopHeaders = ['host', 'connection', 'content-length', 'accept-encoding']
        
        if (hopByHopHeaders.includes(headerKey)) continue
        
        headers[headerKey] = Array.isArray(value) ? value.join(',') : String(value)
      }
      
      // Adicionar headers de contexto
      if (userReq.correlationId) {
        headers['x-correlation-id'] = userReq.correlationId
      }
      
      if (userReq.user) {
        headers['x-user-id'] = userReq.user.sub
        const userRole = userReq.user.role || 'ALUNO'
        headers['x-user-role'] = userRole
        // Adicionar dados do usuário como JSON no header
        headers['x-user-data'] = Buffer.from(JSON.stringify({
          sub: userReq.user.sub,
          role: userRole
        })).toString('base64')
      }
      
      // Content-Type apenas quando há body
      const hasBody = !['GET', 'HEAD'].includes(req.method) && 
                      req.body && Object.keys(req.body).length > 0
      
      if (hasBody && !headers['content-type']) {
        headers['content-type'] = 'application/json'
      }

      // CRUCIAL: Preparar o body com dados do usuário injetados
      let requestBody
      if (hasBody) {
        requestBody = JSON.stringify(req.body)
      }

      // Fazer requisição para o serviço upstream
      const upstreamResponse = await fetch(upstreamUrl, {
        method: req.method,
        headers,
        body: requestBody,
      })

      const responseText = await upstreamResponse.text()

      // Copiar headers da resposta (exceto transfer-encoding)
      upstreamResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'transfer-encoding') return
        
        if (key.toLowerCase() === 'set-cookie') {
          // Tratar Set-Cookie especialmente
          const existing = res.getHeader('Set-Cookie')
          if (existing) {
            const cookies = Array.isArray(existing) 
              ? existing.map(String) 
              : [String(existing)]
            cookies.push(String(value))
            res.setHeader('Set-Cookie', cookies)
          } else {
            res.setHeader('Set-Cookie', String(value))
          }
          return
        }
        
        res.setHeader(key, value)
      })

      res.status(upstreamResponse.status).send(responseText)
      
    } catch (error) {
      userReq.log?.error({ 
        error: (error as Error).message, 
        upstream: upstreamUrl 
      }, 'proxy_error')
      
      res.status(502).json({ 
        error: 'bad_gateway', 
        message: (error as Error).message 
      })
    }
  })
  
  return router
}
