import { Router } from 'express'
import { proxyRouter } from '../upstreamProxy.js'

export const proxyRoutes = Router()

// Roteamento para todos os microserviços
proxyRoutes.use('/auth', proxyRouter('AUTH_SERVICE_BASE_URL', 'auth'))
proxyRoutes.use('/users', proxyRouter('USER_SERVICE_BASE_URL', 'users'))
proxyRoutes.use('/notifications', proxyRouter('NOTIFICATION_SERVICE_BASE_URL', 'notifications'))
proxyRoutes.use('/courses', proxyRouter('COURSE_SERVICE_BASE_URL', 'courses'))
proxyRoutes.use('/assessments', proxyRouter('ASSESSMENT_SERVICE_BASE_URL', 'assessments'))
proxyRoutes.use('/gamification', proxyRouter('GAMIFICATION_SERVICE_BASE_URL', 'gamification'))
proxyRoutes.use('/progress', proxyRouter('PROGRESS_SERVICE_BASE_URL', 'progress'))
