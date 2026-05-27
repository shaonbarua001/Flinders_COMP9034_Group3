import type { Queryable } from '../db/types.js';

function normalizeDate(value: unknown): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return new Date(String(value)).toISOString().slice(0, 10);
}

export interface Repositories {
  audit: {
    log(actor: string, action: string, entity: string, entityId: string, payload: unknown): Promise<number>;
  };
  auth: {
    findStaffLogin(staffId: string): Promise<Array<{ staff_id: string; role: 'admin' | 'staff'; password_hash: string; active: boolean }>>;
    createStaffLogin(input: {
      staffId: string;
      name: string;
      role: 'staff';
      passwordHash: string;
    }): Promise<{ staff_id: string; role: 'admin' | 'staff' }>;
  };
  staff: {
    create(input: {
      staffId: string;
      name: string;
      contractType: string;
      standardHours: number;
      role: string;
      standardRate: number;
      overtimeRate: number;
      passwordHash: string;
    }): Promise<Record<string, unknown>>;
    list(): Promise<Record<string, unknown>[]>;
    update(staffId: string, input: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    deactivate(staffId: string): Promise<Record<string, unknown> | null>;
    findPk(staffId: string): Promise<number | null>;
    findBasicByPk(staffPk: number): Promise<{ staff_id: string; name: string } | null>;
    listActiveBasic(): Promise<Array<{ id: number; staff_id: string; name: string; standard_hours?: string; standard_rate?: string; overtime_rate?: string }>>;
    listActivePayRates(): Promise<Array<{ id: number; staff_id: string; standard_hours: string; standard_rate: string; overtime_rate: string }>>;
  };
  station: {
    create(input: { name: string; location: string; methodType: string }): Promise<Record<string, unknown>>;
    list(): Promise<Record<string, unknown>[]>;
    update(id: string, input: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    deactivate(id: string): Promise<Record<string, unknown> | null>;
    findById(id: number): Promise<{ id: number; name: string; location: string } | null>;
  };
  identity: {
    upsert(input: {
      staffPk: number;
      methodType: string;
      externalRef: string | null;
      status: string;
    }): Promise<Record<string, unknown>>;
  };
  roster: {
    upsertEntry(input: {
      staffPk: number;
      stationId: number | null;
      date: string;
      startTime: string;
      plannedHours: number;
      notes: string | null;
    }): Promise<Record<string, unknown>>;
    listByRange(from: string, to: string, staffId?: string): Promise<Record<string, unknown>[]>;
    getPlannedHoursByRange(from: string, to: string): Promise<Array<{ staff_id: number; planned_hours: string }>>;
    listStaffRosterDates(from: string, to: string): Promise<Array<{ staff_id: number; roster_date: string }>>;
  };
  timeEvent: {
    create(input: {
      staffPk: number;
      stationId: number | null;
      eventType: string;
      methodType: string;
      breakType: string | null;
      timestamp: string;
      reason: string | null;
      createdBy: string;
    }): Promise<Record<string, unknown>>;
    findLatestByStaffPk(staffPk: number): Promise<{ event_type: string } | null>;
    findLatestClockByStaffPk(staffPk: number): Promise<{ event_type: 'clock_in' | 'clock_out' } | null>;
    listByTimestampRange(start: string, endExclusive: string): Promise<Array<{ staff_id: number; event_type: string; event_timestamp: string }>>;
  };
  exception: {
    findOpen(type: string, staffId: number, date: string): Promise<boolean>;
    create(input: {
      type: string;
      staffId: number;
      date: string;
      severity: string;
      notes: string;
    }): Promise<Record<string, unknown>>;
    listByStatus(status: string): Promise<Record<string, unknown>[]>;
    resolve(id: string, actor: string, notes: string | null): Promise<Record<string, unknown> | null>;
  };
  payroll: {
    createOrOpenPayPeriod(startDate: string, endDate: string): Promise<number>;
    createRun(payPeriodId: number, actor: string): Promise<number>;
    deleteItemsByRunId(payRunId: string): Promise<void>;
    getRunById(id: string): Promise<{ id: number; pay_period_id: number } | null>;
    getPeriodById(id: number): Promise<{ start_date: string; end_date: string } | null>;
    insertRunItem(input: {
      payRunId: number;
      staffPk: number;
      hours: number;
      overtimeHours: number;
      basePay: number;
      overtimePay: number;
      deductions: number;
      totalPay: number;
      details: unknown;
    }): Promise<Record<string, unknown>>;
    finalizeRun(id: string): Promise<{ id: number; pay_period_id: number; status: string; finalized_at: string } | null>;
    closePayPeriod(id: number): Promise<void>;
    listPayslipsByRun(id: string): Promise<Record<string, unknown>[]>;
    listPayslipsCsvByRun(id: string): Promise<Record<string, unknown>[]>;
  };
}

export function createRepositories(db: Queryable): Repositories {
  return {
    audit: {
      async log(actor, action, entity, entityId, payload) {
        const result = await db.query<{ id: number }>(
          `INSERT INTO audit_logs (actor, action, entity, entity_id, payload)
           VALUES ($1, $2, $3, $4, $5::jsonb)
           RETURNING id`,
          [actor, action, entity, entityId, JSON.stringify(payload)]
        );
        return result.rows[0].id;
      }
    },
    auth: {
      async findStaffLogin(staffId: string) {
        const result = await db.query<{ staff_id: string; role: 'admin' | 'staff'; password_hash: string; active: boolean }>(
          'SELECT staff_id, role, password_hash, active FROM staff WHERE staff_id = $1',
          [staffId]
        );
        return result.rows;
      },
      async createStaffLogin(input) {
        const result = await db.query<{ staff_id: string; role: 'admin' | 'staff' }>(
          `INSERT INTO staff (staff_id, name, contract_type, standard_hours, role, standard_rate, overtime_rate, password_hash)
           VALUES ($1, $2, 'casual', 38, $3, 0, 0, $4)
           RETURNING staff_id, role`,
          [input.staffId, input.name, input.role, input.passwordHash]
        );
        return result.rows[0];
      }
    },
    staff: {
      async create(input) {
        const created = await db.query(
          `INSERT INTO staff (staff_id, name, contract_type, standard_hours, role, standard_rate, overtime_rate, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING staff_id, name, contract_type, standard_hours, role, standard_rate, overtime_rate, active`,
          [
            input.staffId,
            input.name,
            input.contractType,
            input.standardHours,
            input.role,
            input.standardRate,
            input.overtimeRate,
            input.passwordHash
          ]
        );
        return created.rows[0] as Record<string, unknown>;
      },
      async list() {
        const result = await db.query(
          `SELECT staff_id, name, contract_type, standard_hours, role, standard_rate, overtime_rate, active
           FROM staff ORDER BY staff_id ASC`
        );
        return result.rows as Record<string, unknown>[];
      },
      async update(staffId, input) {
        const result = await db.query(
          `UPDATE staff
           SET
             name = COALESCE($2, name),
             contract_type = COALESCE($3, contract_type),
             standard_hours = COALESCE($4, standard_hours),
             role = COALESCE($5, role),
             standard_rate = COALESCE($6, standard_rate),
             overtime_rate = COALESCE($7, overtime_rate),
             active = COALESCE($8, active),
             updated_at = NOW()
           WHERE staff_id = $1
           RETURNING staff_id, name, contract_type, standard_hours, role, standard_rate, overtime_rate, active`,
          [
            staffId,
            (input.name as string | undefined) ?? null,
            (input.contractType as string | undefined) ?? null,
            (input.standardHours as number | undefined) ?? null,
            (input.role as string | undefined) ?? null,
            (input.standardRate as number | undefined) ?? null,
            (input.overtimeRate as number | undefined) ?? null,
            (input.active as boolean | undefined) ?? null
          ]
        );
        return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
      },
      async deactivate(staffId) {
        const result = await db.query(
          'UPDATE staff SET active = FALSE, updated_at = NOW() WHERE staff_id = $1 RETURNING staff_id, active',
          [staffId]
        );
        return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
      },
      async findPk(staffId) {
        const result = await db.query<{ id: number }>('SELECT id FROM staff WHERE staff_id = $1', [staffId]);
        return result.rows[0]?.id ?? null;
      },
      async findBasicByPk(staffPk) {
        const result = await db.query<{ staff_id: string; name: string }>(
          'SELECT staff_id, name FROM staff WHERE id = $1',
          [staffPk]
        );
        return result.rows[0] ?? null;
      },
      async listActiveBasic() {
        const result = await db.query<{ id: number; staff_id: string; name: string }>(
          'SELECT id, staff_id, name FROM staff WHERE active = TRUE ORDER BY staff_id ASC'
        );
        return result.rows;
      },
      async listActivePayRates() {
        const result = await db.query<{
          id: number;
          staff_id: string;
          standard_hours: string;
          standard_rate: string;
          overtime_rate: string;
        }>('SELECT id, staff_id, standard_hours, standard_rate, overtime_rate FROM staff WHERE active = TRUE');
        return result.rows;
      }
    },
    station: {
      async create(input) {
        const result = await db.query(
          `INSERT INTO stations (name, location, method_type)
           VALUES ($1, $2, $3)
           RETURNING id, name, location, method_type, active`,
          [input.name, input.location, input.methodType]
        );
        return result.rows[0] as Record<string, unknown>;
      },
      async list() {
        const result = await db.query('SELECT id, name, location, method_type, active FROM stations ORDER BY id ASC');
        return result.rows as Record<string, unknown>[];
      },
      async update(id, input) {
        const result = await db.query(
          `UPDATE stations
           SET name = COALESCE($2, name),
               location = COALESCE($3, location),
               method_type = COALESCE($4, method_type),
               active = COALESCE($5, active),
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, name, location, method_type, active`,
          [
            id,
            (input.name as string | undefined) ?? null,
            (input.location as string | undefined) ?? null,
            (input.methodType as string | undefined) ?? null,
            (input.active as boolean | undefined) ?? null
          ]
        );
        return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
      },
      async deactivate(id) {
        const result = await db.query('UPDATE stations SET active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, active', [id]);
        return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
      },
      async findById(id) {
        const result = await db.query<{ id: number; name: string; location: string }>(
          'SELECT id, name, location FROM stations WHERE id = $1',
          [id]
        );
        return result.rows[0] ?? null;
      }
    },
    identity: {
      async upsert(input) {
        const result = await db.query(
          `INSERT INTO staff_identity_methods (staff_id, method_type, external_ref, status, enrolled_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT (staff_id, method_type)
           DO UPDATE SET external_ref = EXCLUDED.external_ref, status = EXCLUDED.status, updated_at = NOW()
           RETURNING id, method_type, external_ref, status, enrolled_at, updated_at`,
          [input.staffPk, input.methodType, input.externalRef, input.status]
        );
        return result.rows[0] as Record<string, unknown>;
      }
    },
    roster: {
      async upsertEntry(input) {
        const result = await db.query(
          `INSERT INTO rosters (staff_id, station_id, roster_date, start_time, planned_hours, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (staff_id, roster_date, start_time)
           DO UPDATE SET station_id = EXCLUDED.station_id, planned_hours = EXCLUDED.planned_hours, notes = EXCLUDED.notes, updated_at = NOW()
           RETURNING id, staff_id, station_id, roster_date, start_time, planned_hours, notes`,
          [input.staffPk, input.stationId, input.date, input.startTime, input.plannedHours, input.notes]
        );
        return result.rows[0] as Record<string, unknown>;
      },
      async listByRange(from, to, staffId) {
        const whereForRole = staffId ? 'AND s.staff_id = $3' : '';
        const params: unknown[] = [from, to];
        if (staffId) {
          params.push(staffId);
        }

        const result = await db.query(
          `SELECT r.id, s.staff_id, st.name AS station_name, r.roster_date, r.start_time, r.planned_hours, r.notes
           FROM rosters r
           JOIN staff s ON s.id = r.staff_id
           LEFT JOIN stations st ON st.id = r.station_id
           WHERE r.roster_date BETWEEN $1 AND $2
           ${whereForRole}
           ORDER BY r.roster_date ASC, s.staff_id ASC`,
          params
        );
        return result.rows as Record<string, unknown>[];
      },
      async getPlannedHoursByRange(from, to) {
        const result = await db.query<{ staff_id: number; planned_hours: string }>(
          `SELECT staff_id, COALESCE(SUM(planned_hours), 0) AS planned_hours
           FROM rosters
           WHERE roster_date BETWEEN $1 AND $2
           GROUP BY staff_id`,
          [from, to]
        );
        return result.rows;
      },
      async listStaffRosterDates(from, to) {
        const result = await db.query<{ staff_id: number; roster_date: string }>(
          `SELECT staff_id, roster_date
           FROM rosters
           WHERE roster_date BETWEEN $1 AND $2`,
          [from, to]
        );
        return result.rows.map((row) => ({
          staff_id: row.staff_id,
          roster_date: normalizeDate(row.roster_date)
        }));
      }
    },
    timeEvent: {
      async create(input) {
        const result = await db.query(
          `INSERT INTO time_events (staff_id, station_id, event_type, method_type, break_type, event_timestamp, reason, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, staff_id, station_id, event_type, method_type, break_type, event_timestamp, reason`,
          [
            input.staffPk,
            input.stationId,
            input.eventType,
            input.methodType,
            input.breakType,
            input.timestamp,
            input.reason,
            input.createdBy
          ]
        );
        return result.rows[0] as Record<string, unknown>;
      },
      async findLatestByStaffPk(staffPk) {
        const result = await db.query<{ event_type: string }>(
          `SELECT event_type
           FROM time_events
           WHERE staff_id = $1
           ORDER BY event_timestamp DESC, id DESC
           LIMIT 1`,
          [staffPk]
        );
        return result.rows[0] ?? null;
      },
      async findLatestClockByStaffPk(staffPk) {
        const result = await db.query<{ event_type: 'clock_in' | 'clock_out' }>(
          `SELECT event_type
           FROM time_events
           WHERE staff_id = $1 AND event_type IN ('clock_in', 'clock_out')
           ORDER BY event_timestamp DESC, id DESC
           LIMIT 1`,
          [staffPk]
        );
        return result.rows[0] ?? null;
      },
      async listByTimestampRange(start, endExclusive) {
        const result = await db.query<{ staff_id: number; event_type: string; event_timestamp: string }>(
          `SELECT staff_id, event_type, event_timestamp
           FROM time_events
           WHERE event_timestamp >= $1 AND event_timestamp < $2
           ORDER BY staff_id ASC, event_timestamp ASC`,
          [start, endExclusive]
        );
        return result.rows;
      }
    },
    exception: {
      async findOpen(type, staffId, date) {
        const result = await db.query(
          `SELECT id FROM exceptions
           WHERE type = $1 AND staff_id = $2 AND exception_date = $3 AND status = 'open'`,
          [type, staffId, date]
        );
        return result.rows.length > 0;
      },
      async create(input) {
        const result = await db.query(
          `INSERT INTO exceptions (type, staff_id, exception_date, severity, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, type, staff_id, exception_date, severity, status`,
          [input.type, input.staffId, input.date, input.severity, input.notes]
        );
        return result.rows[0] as Record<string, unknown>;
      },
      async listByStatus(status) {
        const result = await db.query(
          `SELECT e.id, e.type, s.staff_id, e.exception_date, e.severity, e.status, e.resolved_by, e.resolved_at, e.notes
           FROM exceptions e
           LEFT JOIN staff s ON s.id = e.staff_id
           WHERE e.status = $1
           ORDER BY e.exception_date DESC, e.id DESC`,
          [status]
        );
        return result.rows as Record<string, unknown>[];
      },
      async resolve(id, actor, notes) {
        const result = await db.query(
          `UPDATE exceptions
           SET status = 'resolved', resolved_by = $2, resolved_at = NOW(), notes = COALESCE($3, notes)
           WHERE id = $1
           RETURNING id, type, status, resolved_by, resolved_at, notes`,
          [id, actor, notes]
        );
        return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
      }
    },
    payroll: {
      async createOrOpenPayPeriod(startDate, endDate) {
        const result = await db.query<{ id: number }>(
          `INSERT INTO pay_periods (start_date, end_date, status)
           VALUES ($1, $2, 'open')
           ON CONFLICT (start_date, end_date)
           DO UPDATE SET status = 'open'
           RETURNING id`,
          [startDate, endDate]
        );
        return result.rows[0].id;
      },
      async createRun(payPeriodId, actor) {
        const result = await db.query<{ id: number }>(
          `INSERT INTO pay_runs (pay_period_id, status, created_by)
           VALUES ($1, 'draft', $2)
           RETURNING id`,
          [payPeriodId, actor]
        );
        return result.rows[0].id;
      },
      async deleteItemsByRunId(payRunId) {
        await db.query('DELETE FROM pay_run_items WHERE pay_run_id = $1', [payRunId]);
      },
      async getRunById(id) {
        const result = await db.query<{ id: number; pay_period_id: number }>(
          'SELECT id, pay_period_id FROM pay_runs WHERE id = $1',
          [id]
        );
        return result.rows[0] ?? null;
      },
      async getPeriodById(id) {
        const result = await db.query<{ start_date: string; end_date: string }>(
          'SELECT start_date, end_date FROM pay_periods WHERE id = $1',
          [id]
        );
        return result.rows[0] ?? null;
      },
      async insertRunItem(input) {
        const result = await db.query(
          `INSERT INTO pay_run_items
           (pay_run_id, staff_id, hours, overtime_hours, base_pay, overtime_pay, deductions, total_pay, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
           RETURNING id, pay_run_id, staff_id, hours, overtime_hours, base_pay, overtime_pay, deductions, total_pay`,
          [
            input.payRunId,
            input.staffPk,
            input.hours,
            input.overtimeHours,
            input.basePay,
            input.overtimePay,
            input.deductions,
            input.totalPay,
            JSON.stringify(input.details)
          ]
        );
        return result.rows[0] as Record<string, unknown>;
      },
      async finalizeRun(id) {
        const result = await db.query<{ id: number; pay_period_id: number; status: string; finalized_at: string }>(
          `UPDATE pay_runs
           SET status = 'finalized', finalized_at = NOW()
           WHERE id = $1
           RETURNING id, pay_period_id, status, finalized_at`,
          [id]
        );
        return result.rows[0] ?? null;
      },
      async closePayPeriod(id) {
        await db.query('UPDATE pay_periods SET status = $2 WHERE id = $1', [id, 'closed']);
      },
      async listPayslipsByRun(id) {
        const result = await db.query(
          `SELECT pri.id, s.staff_id, s.name, pri.hours, pri.overtime_hours, pri.base_pay, pri.overtime_pay, pri.deductions, pri.total_pay
           FROM pay_run_items pri
           JOIN staff s ON s.id = pri.staff_id
           WHERE pri.pay_run_id = $1
           ORDER BY s.staff_id ASC`,
          [id]
        );
        return result.rows as Record<string, unknown>[];
      },
      async listPayslipsCsvByRun(id) {
        const result = await db.query(
          `SELECT s.staff_id, s.name, pri.hours, pri.overtime_hours, pri.base_pay, pri.overtime_pay, pri.deductions, pri.total_pay
           FROM pay_run_items pri
           JOIN staff s ON s.id = pri.staff_id
           WHERE pri.pay_run_id = $1
           ORDER BY s.staff_id ASC`,
          [id]
        );
        return result.rows as Record<string, unknown>[];
      }
    }
  };
}
