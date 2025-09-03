import { Router, Request, Response } from 'express';

export function proxyRouter(envVar: string) {
  const router = Router();
  const base = process.env[envVar];
  router.all('*', async (req: Request, res: Response) => {
    if (!base) return res.status(500).json({ error: 'upstream_not_configured', upstream: envVar });
  // Remove apenas o primeiro segmento de serviço, preservando o restante do path
    let pathAfterService = req.originalUrl.replace(/^\/(auth|users|notifications|courses|assessments|gamification|progress)/, '');
    // Reescrever assets do swagger (gerados com caminho relativo a partir de /docs) adicionando prefixo /docs
    if (/^\/(swagger-ui.*|favicon-.*\.png)$/.test(pathAfterService)) {
      pathAfterService = '/docs' + pathAfterService; // upstream espera /docs/swagger-ui.css
    }
    const url = base + pathAfterService;
  (req as any).log?.debug({ original:req.originalUrl, upstream:url }, 'proxy_request');
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json', 'x-correlation-id': (req as any).correlationId };
      if ((req as any).user) {
        headers['x-user-id'] = (req as any).user.sub;
        headers['x-user-roles'] = ((req as any).user.roles || []).join(',');
      }
      const upstream = await fetch(url, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
      });
      const text = await upstream.text();
      upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'transfer-encoding') return; // avoid issues
        res.setHeader(key, value);
      });
      res.status(upstream.status).send(text);
    } catch (e: any) {
      res.status(502).json({ error: 'bad_gateway', message: e.message });
    }
  });
  return router;
}