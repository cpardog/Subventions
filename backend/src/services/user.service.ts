import { prisma } from '../config/database.js';
import { hashPassword, validatePasswordComplexity } from '../utils/password.js';
import { auditLogger } from '../utils/logger.js';
import { NotFoundError, ConflictError, ValidationError } from '../middlewares/errorHandler.js';
import { CreateUserRequest, UpdateUserRequest, UserResponse, PaginationParams } from '../types/index.js';
import { Rol, EstadoUsuario } from '@prisma/client';

export class UserService {
  /**
   * Create a new user (Diger only)
   */
  async createUser(
    data: CreateUserRequest,
    createdById: string,
    ipAddress: string
  ): Promise<UserResponse> {
    // Validate password
    const validation = validatePasswordComplexity(data.password);
    if (!validation.valid) {
      throw new ValidationError({ password: validation.errors });
    }

    // Check for existing user
    const existing = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: data.email.toLowerCase() },
          { cedula: data.cedula },
        ],
      },
    });

    if (existing) {
      if (existing.email === data.email.toLowerCase()) {
        throw new ConflictError('El correo electrónico ya está registrado');
      }
      throw new ConflictError('La cédula ya está registrada');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await prisma.usuario.create({
      data: {
        cedula: data.cedula,
        email: data.email.toLowerCase(),
        nombreCompleto: data.nombreCompleto,
        passwordHash,
        rol: data.rol,
        creadoPorId: createdById,
      },
    });

    // Audit log
    auditLogger.info('User created', {
      createdUserId: user.id,
      createdBy: createdById,
      rol: data.rol,
      ipAddress,
    });

    return this.formatUserResponse(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserResponse> {
    const user = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('Usuario');
    }

    return this.formatUserResponse(user);
  }

  /**
   * Get users with pagination and filters
   */
  async getUsers(
    params: PaginationParams & { rol?: Rol; estado?: EstadoUsuario; search?: string }
  ): Promise<{ users: UserResponse[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'creadoEn', sortOrder = 'desc', rol, estado, search } = params;

    const where: Record<string, unknown> = {};

    if (rol) {
      where['rol'] = rol;
    }

    if (estado) {
      where['estado'] = estado;
    }

    if (search) {
      where['OR'] = [
        { nombreCompleto: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cedula: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.usuario.count({ where }),
    ]);

    return {
      users: users.map(this.formatUserResponse),
      total,
    };
  }

  /**
   * Update user
   */
  async updateUser(
    id: string,
    data: UpdateUserRequest,
    updatedById: string,
    ipAddress: string
  ): Promise<UserResponse> {
    const user = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('Usuario');
    }

    // Check email uniqueness if changing
    if (data.email && data.email.toLowerCase() !== user.email) {
      const existingEmail = await prisma.usuario.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (existingEmail) {
        throw new ConflictError('El correo electrónico ya está en uso');
      }
    }

    // Track role changes
    const previousRol = user.rol;
    const newRol = data.rol;

    // Update user
    const updated = await prisma.usuario.update({
      where: { id },
      data: {
        ...(data.nombreCompleto && { nombreCompleto: data.nombreCompleto }),
        ...(data.email && { email: data.email.toLowerCase() }),
        ...(data.estado && { estado: data.estado as EstadoUsuario }),
        ...(data.rol && { rol: data.rol }),
      },
    });

    // Log role change separately
    if (newRol && newRol !== previousRol) {
      await prisma.cambioRol.create({
        data: {
          usuarioId: id,
          rolAnterior: previousRol,
          rolNuevo: newRol,
          cambiadoPorId: updatedById,
        },
      });

      auditLogger.info('User role changed', {
        userId: id,
        previousRol,
        newRol,
        changedBy: updatedById,
        ipAddress,
      });
    }

    auditLogger.info('User updated', {
      userId: id,
      updatedBy: updatedById,
      changes: data,
      ipAddress,
    });

    return this.formatUserResponse(updated);
  }

  /**
   * Deactivate user
   */
  async deactivateUser(
    id: string,
    deactivatedById: string,
    ipAddress: string
  ): Promise<void> {
    const user = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('Usuario');
    }

    await prisma.usuario.update({
      where: { id },
      data: { estado: EstadoUsuario.INACTIVO },
    });

    auditLogger.info('User deactivated', {
      userId: id,
      deactivatedBy: deactivatedById,
      ipAddress,
    });
  }

  /**
   * Unlock user account
   */
  async unlockUser(
    id: string,
    unlockedById: string,
    ipAddress: string
  ): Promise<void> {
    const user = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('Usuario');
    }

    await prisma.usuario.update({
      where: { id },
      data: {
        estado: EstadoUsuario.ACTIVO,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      },
    });

    auditLogger.info('User unlocked', {
      userId: id,
      unlockedBy: unlockedById,
      ipAddress,
    });
  }

  /**
   * Get users by role (for beneficiary/arrendador selection)
   */
  async getUsersByRole(rol: Rol): Promise<UserResponse[]> {
    const users = await prisma.usuario.findMany({
      where: {
        rol,
        estado: EstadoUsuario.ACTIVO,
      },
      orderBy: { nombreCompleto: 'asc' },
    });

    return users.map(this.formatUserResponse);
  }

  // Private methods

  private formatUserResponse(user: {
    id: string;
    cedula: string;
    email: string;
    nombreCompleto: string;
    rol: Rol;
    estado: EstadoUsuario;
    mfaHabilitado: boolean;
    creadoEn: Date;
    ultimoAcceso: Date | null;
  }): UserResponse {
    return {
      id: user.id,
      cedula: user.cedula,
      email: user.email,
      nombreCompleto: user.nombreCompleto,
      rol: user.rol,
      estado: user.estado,
      mfaHabilitado: user.mfaHabilitado,
      creadoEn: user.creadoEn,
      ultimoAcceso: user.ultimoAcceso ?? undefined,
    };
  }
}

export const userService = new UserService();
