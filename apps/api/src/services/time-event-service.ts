import { NotFoundError } from '../domain/errors.js';
import type { Repositories } from '../repositories/app-repositories.js';

export interface TimeEventService {
  create(input: {
    actor: string;
    staffId: string;
    stationId?: number;
    eventType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
    methodType: 'card' | 'face' | 'fingerprint' | 'retinal';
    timestamp: string;
    breakType?: 'tea' | 'lunch' | 'safety';
    reason?: string;
  }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
}

export function createTimeEventService(repositories: Repositories): TimeEventService {
  return {
    async create(input) {
      const staffPk = await repositories.staff.findPk(input.staffId);
      if (!staffPk) {
        throw new NotFoundError('staff_not_found');
      }

      const created = await repositories.timeEvent.create({
        staffPk,
        stationId: input.stationId ?? null,
        eventType: input.eventType,
        methodType: input.methodType,
        breakType: input.breakType ?? null,
        timestamp: input.timestamp,
        reason: input.reason ?? null,
        createdBy: input.actor
      });

      const auditReferenceId = await repositories.audit.log(
        input.actor,
        'time_event.create',
        'time_events',
        String(created.id),
        created
      );

      return { data: created, auditReferenceId };
    }
  };
}
