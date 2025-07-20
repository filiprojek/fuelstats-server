import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/environment';
import { Err, Succ } from '../services/globalService';

export interface AuthRequest extends Request {
  user?: any;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    new Err(401, 'No token provided');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    req.user = decoded;
    new Succ(200, `Token verified for user ${decoded.sub}`);
    next();
  } catch (err: any) {
    new Err(401, 'Invalid token');
    return res.status(401).json({ message: 'Invalid token' });
  }
}
