import { Router } from 'express';
import { proxyRouter } from '../upstreamProxy.js';
export const proxyRoutes = Router();

// Intercepta respostas para repassar Set-Cookie (se upstream proxy suportar hook interno)
// Caso proxyRouter já trate, este bloco pode ser removido após verificação.
// (Se precisar integrar: ajustar upstreamProxy para aceitar onProxyRes.)

proxyRoutes.use('/auth', proxyRouter('AUTH_SERVICE_BASE_URL','auth'));
proxyRoutes.use('/users', proxyRouter('USER_SERVICE_BASE_URL','users'));
proxyRoutes.use('/notifications', proxyRouter('NOTIFICATION_SERVICE_BASE_URL','notifications'));
proxyRoutes.use('/courses', proxyRouter('COURSE_SERVICE_BASE_URL','courses'));
proxyRoutes.use('/assessments', proxyRouter('ASSESSMENT_SERVICE_BASE_URL','assessments'));
proxyRoutes.use('/gamification', proxyRouter('GAMIFICATION_SERVICE_BASE_URL','gamification'));
proxyRoutes.use('/progress', proxyRouter('PROGRESS_SERVICE_BASE_URL','progress'));
// Lista de documentações central JSON (fora do swagger principal): /docs/services
proxyRoutes.get('/docs/services', (_req,res)=>{
  res.json({ services:[
    { name:'auth', url:'/auth/docs' },
    { name:'user', url:'/users/docs' },
    { name:'course', url:'/courses/docs' },
    { name:'assessment', url:'/assessments/docs' },
    { name:'progress', url:'/progress/docs' },
    { name:'gamification', url:'/gamification/docs' },
    { name:'notification', url:'/notifications/docs' }
  ]});
});
