import { Router } from 'express';
import { proxyRouter } from '../upstreamProxy.js';
export const proxyRoutes = Router();
proxyRoutes.use('/auth', proxyRouter('AUTH_SERVICE_BASE_URL'));
proxyRoutes.use('/users', proxyRouter('USER_SERVICE_BASE_URL'));
proxyRoutes.use('/notifications', proxyRouter('NOTIFICATION_SERVICE_BASE_URL'));
proxyRoutes.use('/courses', proxyRouter('COURSE_SERVICE_BASE_URL'));
proxyRoutes.use('/assessments', proxyRouter('ASSESSMENT_SERVICE_BASE_URL'));
proxyRoutes.use('/gamification', proxyRouter('GAMIFICATION_SERVICE_BASE_URL'));
proxyRoutes.use('/progress', proxyRouter('PROGRESS_SERVICE_BASE_URL'));
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
