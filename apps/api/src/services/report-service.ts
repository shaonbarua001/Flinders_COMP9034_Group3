import { asNumber } from '../http/utils.js';
import type { Repositories } from '../repositories/app-repositories.js';
import { getWorkedHoursByStaff } from './helpers.js';

export interface ReportService {
  attendance(input: { from: string; to: string }): Promise<{
    from: string;
    to: string;
    data: Array<{
      staffId: string;
      name: string;
      plannedHours: number;
      actualHours: number;
      varianceHours: number;
    }>;
  }>;
  attendanceCsv(input: { from: string; to: string }): Promise<Array<Record<string, unknown>>>;
}

export function createReportService(repositories: Repositories): ReportService {
  return {
    async attendance(input) {
      const workedByStaff = await getWorkedHoursByStaff(repositories, input.from, input.to);
      const plannedRows = await repositories.roster.getPlannedHoursByRange(input.from, input.to);
      const plannedByStaff = new Map<number, number>();
      for (const row of plannedRows) {
        plannedByStaff.set(row.staff_id, asNumber(row.planned_hours));
      }

      const staffRows = await repositories.staff.listActiveBasic();
      const data = staffRows.map((staff) => {
        const actualHours = workedByStaff.get(staff.id) ?? 0;
        const plannedHours = plannedByStaff.get(staff.id) ?? 0;
        return {
          staffId: staff.staff_id,
          name: staff.name,
          plannedHours,
          actualHours,
          varianceHours: Number((actualHours - plannedHours).toFixed(2))
        };
      });

      return {
        from: input.from,
        to: input.to,
        data
      };
    },
    async attendanceCsv(input) {
      const workedByStaff = await getWorkedHoursByStaff(repositories, input.from, input.to);
      const staffRows = await repositories.staff.listActiveBasic();
      return staffRows.map((staff) => ({
        staffId: staff.staff_id,
        name: staff.name,
        actualHours: workedByStaff.get(staff.id) ?? 0
      }));
    }
  };
}
