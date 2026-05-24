import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { sendError } from '../utils/responseWrapper';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return sendError(res, 401, 'Not authorized, no token');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const userId = String(decoded.id);
    const user = await User.findById(userId).select('-password -verificationCode -otpExpiresAt');
    if (!user) return sendError(res, 401, 'Not authorized, user not found');

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 401, 'Not authorized, token failed');
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 403, `User role ${req.user?.role} is not authorized to access this route`);
    }
    next();
  };
};

/**
 * optionalProtect: Silently attaches req.user if a valid Bearer token is
 * present, but does NOT fail the request if no token is provided.
 * Use on public routes that need to behave differently for authenticated users.
 */
export const optionalProtect = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) return next();
    const token = authHeader.split(' ')[1];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(decoded.id).select('-password');
    if (user) req.user = user;
  } catch (error: any) {
    console.error('[optionalProtect] Error:', error.message);
    // Invalid/expired token — treat as unauthenticated, continue anyway
  }
  next();
};
