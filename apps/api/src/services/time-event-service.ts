import { NotFoundError, ValidationError } from '../domain/errors.js';
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
    isManual?: boolean;
  }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
  getStatus(input: { staffId: string }): Promise<{ data: { staffId: string; clockedIn: boolean; lastEventType: string | null } }>;
}

export function createTimeEventService(repositories: Repositories): TimeEventService {
  return {
    async create(input) {
      const staffPk = await repositories.staff.findPk(input.staffId);
      if (!staffPk) {
        throw new NotFoundError('staff_not_found');
      }

      const latestClock = await repositories.timeEvent.findLatestClockByStaffPk(staffPk);
      const clockedIn = latestClock?.event_type === 'clock_in';

      if (input.eventType === 'break_start' && !clockedIn) {
        throw new ValidationError('staff_not_clocked_in');
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

      const isManualClockAction =
        input.isManual === true && (input.eventType === 'clock_in' || input.eventType === 'clock_out');
      let auditAction = 'time_event.create';
      let auditPayload: unknown = created;

      if (isManualClockAction) {
        const staff = await repositories.staff.findBasicByPk(staffPk);
        const station = input.stationId ? await repositories.station.findById(input.stationId) : null;
        auditAction = 'time_event.manual';
        auditPayload = {
          adminId: input.actor,
          staffId: staff?.staff_id ?? input.staffId,
          staffName: staff?.name ?? null,
          eventType: input.eventType === 'clock_in' ? 'manual_clock_in' : 'manual_clock_out',
          reason: input.reason ?? null,
          stationId: station?.id ?? null,
          stationName: station?.name ?? null,
          stationLocation: station?.location ?? null,
          timestamp: input.timestamp,
          timeEventId: created.id
        };
      }

      const auditReferenceId = await repositories.audit.log(input.actor, auditAction, 'time_events', String(created.id), auditPayload);

      return { data: created, auditReferenceId };
    },
    async getStatus(input) {
      const staffPk = await repositories.staff.findPk(input.staffId);
      if (!staffPk) {
        throw new NotFoundError('staff_not_found');
      }

      const [latestEvent, latestClock] = await Promise.all([
        repositories.timeEvent.findLatestByStaffPk(staffPk),
        repositories.timeEvent.findLatestClockByStaffPk(staffPk)
      ]);

      return {
        data: {
          staffId: input.staffId,
          clockedIn: latestClock?.event_type === 'clock_in',
          lastEventType: latestEvent?.event_type ?? null
        }
      };
    }
  };
}
