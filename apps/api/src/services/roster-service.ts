import { NotFoundError } from '../domain/errors.js';
import type { Repositories } from '../repositories/app-repositories.js';

export interface RosterService {
  upsert(input: {
    actor: string;
    entries: Array<{
      staffId: string;
      stationId?: number;
      date: string;
      startTime: string;
      plannedHours: number;
      notes?: string;
    }>;
  }): Promise<{ data: Record<string, unknown>[]; auditReferenceId: number }>;
  listByRange(input: { from: string; to: string; role: 'admin' | 'staff'; actor: string }): Promise<{ data: Record<string, unknown>[] }>;
}

export function createRosterService(repositories: Repositories): RosterService {
  return {
    async upsert(input) {
      const upserted: Record<string, unknown>[] = [];
      for (const entry of input.entries) {
        const staffPk = await repositories.staff.findPk(entry.staffId);
        if (!staffPk) {
          throw new NotFoundError(`staff_not_found:${entry.staffId}`);
        }
        const saved = await repositories.roster.upsertEntry({
          staffPk,
          stationId: entry.stationId ?? null,
          date: entry.date,
          startTime: entry.startTime,
          plannedHours: entry.plannedHours,
          notes: entry.notes ?? null
        });
        upserted.push(saved);
      }

      const auditReferenceId = await repositories.audit.log(
        input.actor,
        'roster.upsert',
        'rosters',
        'bulk',
        upserted
      );

      return { data: upserted, auditReferenceId };
    },
    async listByRange(input) {
      const staffId = input.role === 'staff' ? input.actor : undefined;
      const data = await repositories.roster.listByRange(input.from, input.to, staffId);
      return { data };
    }
  };
}
