import { computeWorkedHours, type TimeEvent as CalcTimeEvent } from '../lib/timecalc.js';
import { dateBounds } from '../http/utils.js';
import type { Repositories } from '../repositories/app-repositories.js';

export async function getWorkedHoursByStaff(
  repositories: Repositories,
  startDate: string,
  endDate: string
): Promise<Map<number, number>> {
  const bounds = dateBounds(startDate, endDate);
  const rows = await repositories.timeEvent.listByTimestampRange(bounds.start, bounds.endExclusive);

  const eventsByStaff = new Map<number, CalcTimeEvent[]>();
  for (const row of rows) {
    const current = eventsByStaff.get(row.staff_id) ?? [];
    current.push({ eventType: row.event_type, timestamp: row.event_timestamp });
    eventsByStaff.set(row.staff_id, current);
  }

  const hoursByStaff = new Map<number, number>();
  for (const [staffId, events] of eventsByStaff.entries()) {
    hoursByStaff.set(staffId, computeWorkedHours(events));
  }

  return hoursByStaff;
}
