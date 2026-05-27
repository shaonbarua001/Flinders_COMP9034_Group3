import { NotFoundError } from '../domain/errors.js';
import { hashPassword } from '../lib/auth.js';
import type { Repositories } from '../repositories/app-repositories.js';

export interface StaffService {
  create(input: {
    actor: string;
    staffId: string;
    name: string;
    contractType: 'casual' | 'part_time' | 'full_time';
    standardHours: number;
    role: 'admin' | 'staff';
    standardRate: number;
    overtimeRate: number;
    password?: string;
  }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
  list(): Promise<{ data: Record<string, unknown>[] }>;
  update(input: {
    actor: string;
    staffId: string;
    patch: {
      name?: string;
      contractType?: 'casual' | 'part_time' | 'full_time';
      standardHours?: number;
      role?: 'admin' | 'staff';
      standardRate?: number;
      overtimeRate?: number;
      active?: boolean;
    };
  }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
  deactivate(input: { actor: string; staffId: string }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
  upsertIdentity(input: {
    actor: string;
    staffId: string;
    methodType: string;
    status: string;
    externalRef?: string;
  }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
}

export function createStaffService(repositories: Repositories): StaffService {
  return {
    async create(input) {
      const passwordHash = hashPassword(input.password ?? 'ChangeMe123!');
      const staff = await repositories.staff.create({
        staffId: input.staffId,
        name: input.name,
        contractType: input.contractType,
        standardHours: input.standardHours,
        role: input.role,
        standardRate: input.standardRate,
        overtimeRate: input.overtimeRate,
        passwordHash
      });
      const auditReferenceId = await repositories.audit.log(
        input.actor,
        'staff.create',
        'staff',
        String(staff.staff_id),
        staff
      );
      return { data: staff, auditReferenceId };
    },
    async list() {
      const data = await repositories.staff.list();
      return { data };
    },
    async update(input) {
      const staff = await repositories.staff.update(input.staffId, input.patch);
      if (!staff) {
        throw new NotFoundError('staff_not_found');
      }
      const auditReferenceId = await repositories.audit.log(
        input.actor,
        'staff.update',
        'staff',
        input.staffId,
        input.patch
      );
      return { data: staff, auditReferenceId };
    },
    async deactivate(input) {
      const staff = await repositories.staff.deactivate(input.staffId);
      if (!staff) {
        throw new NotFoundError('staff_not_found');
      }
      const auditReferenceId = await repositories.audit.log(
        input.actor,
        'staff.deactivate',
        'staff',
        input.staffId,
        { active: false }
      );
      return { data: staff, auditReferenceId };
    },
    async upsertIdentity(input) {
      const staffPk = await repositories.staff.findPk(input.staffId);
      if (!staffPk) {
        throw new NotFoundError('staff_not_found');
      }
      const updated = await repositories.identity.upsert({
        staffPk,
        methodType: input.methodType,
        externalRef: input.externalRef ?? null,
        status: input.status
      });
      const auditReferenceId = await repositories.audit.log(
        input.actor,
        'staff.identity.update',
        'staff_identity_methods',
        String(updated.id),
        updated
      );
      return { data: updated, auditReferenceId };
    }
  };
}
