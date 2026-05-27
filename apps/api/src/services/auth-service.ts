import { signToken, verifyPassword, type UserRole } from '../lib/auth.js';
import type { Repositories } from '../repositories/app-repositories.js';

export interface AuthService {
  login(staffId: string, password: string): Promise<{ token: string; role: UserRole } | null>;
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
    }
  };
}
