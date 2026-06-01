import type { Queryable } from '../db/types.js';
import { asNumber } from '../http/utils.js';
import { NotFoundError } from '../domain/errors.js';
import { COMPLIANCE_RULE_CODES, DEFAULT_COMPLIANCE_THRESHOLDS } from '../lib/compliance.js';
import { calculatePayroll } from '../lib/timecalc.js';
import { createRepositories, type Repositories } from '../repositories/app-repositories.js';
import { withTransaction } from '../repositories/tx.js';
import { getWorkedHoursByStaff } from './helpers.js';

async function generateRunWithRepos(
  repositories: Repositories,
  startDate: string,
  endDate: string,
  actor: string
): Promise<{ payRunId: number; payPeriodId: number; items: Record<string, unknown>[] }> {
  const payPeriodId = await repositories.payroll.createOrOpenPayPeriod(startDate, endDate);
  const payRunId = await repositories.payroll.createRun(payPeriodId, actor);

  const staffRows = await repositories.staff.listActivePayRates();
  const workedByStaff = await getWorkedHoursByStaff(repositories, startDate, endDate);
  const items: Record<string, unknown>[] = [];

  for (const staff of staffRows) {
    const hours = workedByStaff.get(staff.id) ?? 0;
    const maxWeeklyHours =
      (await repositories.compliance.getActiveThreshold(COMPLIANCE_RULE_CODES.maxWeeklyHours, endDate)) ??
      DEFAULT_COMPLIANCE_THRESHOLDS.maxWeeklyHours;
    const item = calculatePayroll(
      hours,
      maxWeeklyHours,
      asNumber(staff.standard_rate),
      asNumber(staff.overtime_rate),
      0
    );

    const inserted = await repositories.payroll.insertRunItem({
      payRunId,
      staffPk: staff.id,
      hours: item.hours,
      overtimeHours: item.overtimeHours,
      basePay: item.basePay,
      overtimePay: item.overtimePay,
      deductions: item.deductions,
      totalPay: item.totalPay,
      details: item
    });

    items.push(inserted);
  }

  return { payRunId, payPeriodId, items };
}

export interface PayrollService {
  generate(input: { actor: string; startDate: string; endDate: string }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
  recalculate(input: { actor: string; id: string }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
  finalize(input: { actor: string; id: string }): Promise<{ data: Record<string, unknown>; auditReferenceId: number }>;
  payslips(input: { id: string }): Promise<{ payRunId: string; data: Record<string, unknown>[] }>;
  payslipsCsv(input: { id: string }): Promise<Record<string, unknown>[]>;
}

export function createPayrollService(db: Queryable): PayrollService {
  const repositories = createRepositories(db);

  return {
    async generate(input) {
      const generated = await withTransaction(db, async (tx) => {
        const txRepos = createRepositories(tx);
        return generateRunWithRepos(txRepos, input.startDate, input.endDate, input.actor);
      });

      const auditReferenceId = await repositories.audit.log(input.actor, 'payrun.generate', 'pay_runs', String(generated.payRunId), {
        startDate: input.startDate,
        endDate: input.endDate,
        itemCount: generated.items.length
      });

      return {
        data: {
          payRunId: generated.payRunId,
          payPeriodId: generated.payPeriodId,
          status: 'draft',
          items: generated.items
        },
        auditReferenceId
      };
    },
    async recalculate(input) {
      const run = await repositories.payroll.getRunById(input.id);
      if (!run) {
        throw new NotFoundError('pay_run_not_found');
      }

      const period = await repositories.payroll.getPeriodById(run.pay_period_id);
      if (!period) {
        throw new NotFoundError('pay_period_not_found');
      }

      await withTransaction(db, async (tx) => {
        const txRepos = createRepositories(tx);
        await txRepos.payroll.deleteItemsByRunId(input.id);
      });

      const startDate = new Date(period.start_date).toISOString().slice(0, 10);
      const endDate = new Date(period.end_date).toISOString().slice(0, 10);
      const regenerated = await withTransaction(db, async (tx) => {
        const txRepos = createRepositories(tx);
        return generateRunWithRepos(txRepos, startDate, endDate, input.actor);
      });

      const auditReferenceId = await repositories.audit.log(input.actor, 'payrun.recalculate', 'pay_runs', input.id, {
        replacedWithRunId: regenerated.payRunId
      });

      return { data: regenerated, auditReferenceId };
    },
    async finalize(input) {
      const finalized = await repositories.payroll.finalizeRun(input.id);
      if (!finalized) {
        throw new NotFoundError('pay_run_not_found');
      }

      await repositories.payroll.closePayPeriod(finalized.pay_period_id);
      const auditReferenceId = await repositories.audit.log(input.actor, 'payrun.finalize', 'pay_runs', input.id, {});
      return { data: finalized, auditReferenceId };
    },
    async payslips(input) {
      const data = await repositories.payroll.listPayslipsByRun(input.id);
      return { payRunId: input.id, data };
    },
    async payslipsCsv(input) {
      return repositories.payroll.listPayslipsCsvByRun(input.id);
    }
  };
}
