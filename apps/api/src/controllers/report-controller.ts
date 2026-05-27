import { requireRole } from '../lib/auth.js';
import { handleControllerError } from '../http/error-handler.js';
import { toCsv } from '../http/utils.js';
import type { ControllerContext } from './types.js';

export function registerReportController(ctx: ControllerContext): void {
  const { app, basePath, authSecret, services } = ctx;
  const requireAdmin = requireRole('admin', authSecret);

  app.get(`${basePath}/reports/attendance`, requireAdmin, async (req, res) => {
    const from = req.query.from;
    const to = req.query.to;
    if (typeof from !== 'string' || typeof to !== 'string') {
      res.status(400).json({ error: 'from_and_to_query_params_are_required' });
      return;
    }

    try {
      res.json(await services.report.attendance({ from, to }));
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.get(`${basePath}/reports/attendance.csv`, requireAdmin, async (req, res) => {
    const from = req.query.from;
    const to = req.query.to;
    if (typeof from !== 'string' || typeof to !== 'string') {
      res.status(400).json({ error: 'from_and_to_query_params_are_required' });
      return;
    }

    try {
      const rows = await services.report.attendanceCsv({ from, to });
      res.type('text/csv').send(toCsv(rows));
    } catch (error) {
      handleControllerError(error, res);
    }
  });
}
