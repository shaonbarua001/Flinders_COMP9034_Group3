import { z } from 'zod';
import { readAuth, requireRole } from '../lib/auth.js';
import { handleControllerError } from '../http/error-handler.js';
import { toCsv } from '../http/utils.js';
import type { ControllerContext } from './types.js';

export function registerPayrollController(ctx: ControllerContext): void {
  const { app, basePath, authSecret, services } = ctx;
  const requireAdmin = requireRole('admin', authSecret);

  app.post(`${basePath}/payroll/runs/generate`, requireAdmin, async (req, res) => {
    const schema = z.object({ startDate: z.string().min(10), endDate: z.string().min(10) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.payroll.generate({ actor: auth.actor, ...parsed.data });
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.post(`${basePath}/payroll/runs/:id/recalculate`, requireAdmin, async (req, res) => {
    try {
      const auth = readAuth(req, authSecret);
      const result = await services.payroll.recalculate({ actor: auth.actor, id: req.params.id });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.post(`${basePath}/payroll/runs/:id/finalize`, requireAdmin, async (req, res) => {
    try {
      const auth = readAuth(req, authSecret);
      const result = await services.payroll.finalize({ actor: auth.actor, id: req.params.id });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.get(`${basePath}/payroll/runs/:id/payslips`, requireAdmin, async (req, res) => {
    try {
      const result = await services.payroll.payslips({ id: req.params.id });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.get(`${basePath}/payroll/runs/:id/payslips.csv`, requireAdmin, async (req, res) => {
    try {
      const rows = await services.payroll.payslipsCsv({ id: req.params.id });
      res.type('text/csv').send(toCsv(rows));
    } catch (error) {
      handleControllerError(error, res);
    }
  });
}
