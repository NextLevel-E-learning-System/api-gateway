import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
const publicPaths=['/auth/v1/login','/auth/v1/register','/health/live','/health/ready','/docs'];
export function authMiddleware(req:Request,res:Response,next:NextFunction){ if(publicPaths.some(p=> req.path.startsWith(p))) return next(); const auth=req.header('authorization'); if(!auth) return res.status(401).json({error:'missing_authorization_header'}); const token=auth.replace(/^Bearer\s+/i,''); try { const payload= jwt.verify(token, process.env.JWT_SECRET||'dev-secret') as any; res.setHeader('x-user-id', payload.sub); res.setHeader('x-user-roles',(payload.roles||[]).join(',')); (req as any).user=payload; return next(); } catch { return res.status(401).json({error:'invalid_token'});} }
