import { detectExceptions } from '../lib/exceptions.js';
import { dateBounds } from '../http/utils.js';
import type { Repositories } from '../repositories/app-repositories.js';
import { NotFoundError } from '../domain/errors.js';

export interface ExceptionService {
  detect(input: { actor: string; from: string; to: string }): Promise<{ data: Record<string, unknown>[]; auditReferenceId: number }>;
  list(input: { status: string }): Promise<{ data: Record<string, unknown>[] }>;
  resolve(input: { actor: string; id: string; notes?: string }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
}

export function createExceptionService(repositories: Repositories): ExceptionService {
  return {
    async detect(input) {
      const bounds = dateBounds(input.from, input.to);
      const events = await repositories.timeEvent.listByTimestampRange(bounds.start, bounds.endExclusive);
      const rosterRows = await repositories.roster.listStaffRosterDates(input.from, input.to);

      const rosterSet = new Set(rosterRows.map((row) => `${row.staff_id}:${row.roster_date}`));
      const grouped = new Map<string, { staffId: number; date: string; events: Array<{ eventType: string; timestamp: string }> }>();

      for (const row of events) {
        const eventDate = new Date(row.event_timestamp).toISOString().slice(0, 10);
        const key = `${row.staff_id}:${eventDate}`;
        const current = grouped.get(key) ?? { staffId: row.staff_id, date: eventDate, events: [] };
        current.events.push({ eventType: row.event_type, timestamp: row.event_timestamp });
        grouped.set(key, current);
      }

      const detectedRecords: Record<string, unknown>[] = [];
      for (const value of grouped.values()) {
        const detected = detectExceptions({
          staffId: value.staffId,
          date: value.date,
          events: value.events,
          hasRoster: rosterSet.has(`${value.staffId}:${value.date}`)
        });

        for (const item of detected) {
          const exists = await repositories.exception.findOpen(item.type, value.staffId, value.date);
          if (exists) {
            continue;
          }

          const inserted = await repositories.exception.create({
            type: item.type,
            staffId: value.staffId,
            date: value.date,
            severity: item.severity,
            notes: 'Auto-detected'
          });
          detectedRecords.push(inserted);
        }
      }

      const auditReferenceId = await repositories.audit.log(input.actor, 'exceptions.detect', 'exceptions', 'bulk', {
        from: input.from,
        to: input.to,
        count: detectedRecords.length
      });

      return { data: detectedRecords, auditReferenceId };
    },
    async list(input) {
      const data = await repositories.exception.listByStatus(input.status);
      return { data };
    },
    async resolve(input) {
      const data = await repositories.exception.resolve(input.id, input.actor, input.notes ?? null);
      if (!data) {
        throw new NotFoundError('exception_not_found');
      }
      const auditReferenceId = await repositories.audit.log(
        input.actor,
        'exception.resolve',
        'exceptions',
        input.id,
        { notes: input.notes }
      );
      return { data, auditReferenceId };
    }
  };
}
