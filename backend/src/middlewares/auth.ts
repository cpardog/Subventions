import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import { tokenBlacklist } from '../config/redis.js';
import { AuthenticationError, AuthorizationError } from './errorHandler.js';
import { Rol, EstadoUsuario } from '@prisma/client';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        rol: Rol;
        nombreCompleto: string;
      };
      token?: string;
    }
  }
}

interface JWTPayload {
  sub: string;
  email: string;
  rol: Rol;
  nombreCompleto: string;
  iat: number;
  exp: number;
}

// Authentication middleware
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Token de acceso requerido');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('Token de acceso requerido');
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      throw new AuthenticationError('Sesión inválida');
    }

    // Verify token
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Sesión expirada');
      }
      throw new AuthenticationError('Token inválido');
    }

    // Verify user exists and is active
    const user = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        rol: true,
        nombreCompleto: true,
        estado: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('Usuario no encontrado');
    }

    if (user.estado !== EstadoUsuario.ACTIVO) {
      throw new AuthenticationError('Cuenta desactivada o bloqueada');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      rol: user.rol,
      nombreCompleto: user.nombreCompleto,
    };
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
}

// Role-based authorization middleware
export function authorize(...allowedRoles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('No autenticado'));
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return next(
        new AuthorizationError(
          `Acceso denegado. Rol requerido: ${allowedRoles.join(' o ')}`
        )
      );
    }

    next();
  };
}

// Middleware to check if user owns the resource or has admin role
export function authorizeOwnerOrRoles(
  userIdExtractor: (req: Request) => string | undefined,
  ...adminRoles: Rol[]
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('No autenticado'));
    }

    const resourceUserId = userIdExtractor(req);

    // Allow if user owns the resource
    if (resourceUserId === req.user.id) {
      return next();
    }

    // Allow if user has admin role
    if (adminRoles.includes(req.user.rol)) {
      return next();
    }

    return next(new AuthorizationError('Acceso denegado'));
  };
}

// Permission matrix for process actions
const PROCESS_PERMISSIONS: Record<string, Rol[]> = {
  create: [Rol.DIGER],
  view: [Rol.BENEFICIARIO, Rol.ARRENDADOR, Rol.DIGER, Rol.DIRECTORA, Rol.ORDENADOR_GASTO, Rol.CRI],
  edit: [Rol.BENEFICIARIO], // Only in BORRADOR state
  submit: [Rol.BENEFICIARIO],
  validateDocs: [Rol.DIGER],
  approveDiger: [Rol.DIGER],
  approveDirectora: [Rol.DIRECTORA],
  approveOrdenador: [Rol.ORDENADOR_GASTO],
  sign: [Rol.ORDENADOR_GASTO],
  close: [Rol.CRI],
  requestCorrection: [Rol.DIGER],
  reject: [Rol.DIGER, Rol.DIRECTORA, Rol.ORDENADOR_GASTO],
};

export function authorizeProcessAction(action: keyof typeof PROCESS_PERMISSIONS) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('No autenticado'));
    }

    const allowedRoles = PROCESS_PERMISSIONS[action];
    if (!allowedRoles) {
      return next(new AuthorizationError('Acción no permitida'));
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return next(new AuthorizationError(`No tiene permisos para: ${action}`));
    }

    next();
  };
}

// Document permissions
const DOCUMENT_PERMISSIONS: Record<string, Rol[]> = {
  upload: [Rol.BENEFICIARIO, Rol.DIGER],
  view: [Rol.BENEFICIARIO, Rol.DIGER, Rol.DIRECTORA, Rol.ORDENADOR_GASTO, Rol.CRI],
  download: [Rol.BENEFICIARIO, Rol.DIGER, Rol.DIRECTORA, Rol.ORDENADOR_GASTO, Rol.CRI],
  validate: [Rol.DIGER],
};

export function authorizeDocumentAction(action: keyof typeof DOCUMENT_PERMISSIONS) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('No autenticado'));
    }

    const allowedRoles = DOCUMENT_PERMISSIONS[action];
    if (!allowedRoles) {
      return next(new AuthorizationError('Acción de documento no permitida'));
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return next(new AuthorizationError(`No tiene permisos para: ${action}`));
    }

    next();
  };
}
