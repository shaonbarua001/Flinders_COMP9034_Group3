import { ConflictError, ValidationError } from '../domain/errors.js';
import { hashPassword, signToken, verifyPassword, type UserRole } from '../lib/auth.js';
import type { Repositories } from '../repositories/app-repositories.js';

export interface AuthService {
  login(staffId: string, password: string): Promise<{ token: string; role: UserRole } | null>;
  register(input: {
    staffId: string;
    name: string;
    role: UserRole;
    password: string;
  }): Promise<{ staffId: string; role: UserRole }>;
}

export function createAuthService(repositories: Repositories, authSecret: string): AuthService {
  return {
    async login(staffId, password) {
      const rows = await repositories.auth.findStaffLogin(staffId);
      if (rows.length === 0) {
        return null;
      }
      const row = rows[0];
      if (!row.active) {
        return null;
      }
      if (!verifyPassword(password, row.password_hash)) {
        return null;
      }

      return {
        token: signToken(row.staff_id, row.role, authSecret),
        role: row.role
      };
    },
    async register(input) {
      if (input.role !== 'staff') {
        throw new ValidationError('admin_register_not_allowed', {
          message: 'Admin accounts cannot be self-registered. Please contact system administrator.'
        });
      }

      const existing = await repositories.auth.findStaffLogin(input.staffId);
      if (existing.length > 0) {
        throw new ConflictError('staff_id_already_exists');
      }

      const created = await repositories.auth.createStaffLogin({
        staffId: input.staffId,
        name: input.name,
        role: 'staff',
        passwordHash: hashPassword(input.password)
      });

      return { staffId: created.staff_id, role: created.role };
    }
  };
}
