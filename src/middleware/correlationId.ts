import { v4 as uuid } from 'uuid';
import { Request, Response, NextFunction } from 'express';
export function correlationId(req:Request,res:Response,next:NextFunction){ const cid=req.header('x-correlation-id')||uuid(); (req as any).correlationId=cid; res.setHeader('x-correlation-id',cid); next(); }
