import { z } from 'zod';
import { readAuth, requireRole } from '../lib/auth.js';
import { handleControllerError } from '../http/error-handler.js';
import type { ControllerContext } from './types.js';

export function registerRosterController(ctx: ControllerContext): void {
  const { app, basePath, authSecret, services } = ctx;
  const requireAdmin = requireRole('admin', authSecret);

  app.post(`${basePath}/rosters`, requireAdmin, async (req, res) => {
    const schema = z.object({
      entries: z.array(
        z.object({
          staffId: z.string().min(1),
          stationId: z.number().int().optional(),
          date: z.string().min(10),
          startTime: z.string().min(4),
          plannedHours: z.number().positive(),
          notes: z.string().optional()
        })
      ).min(1)
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.roster.upsert({ actor: auth.actor, entries: parsed.data.entries });
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.get(`${basePath}/rosters`, async (req, res) => {
    const from = req.query.from;
    const to = req.query.to;
    if (typeof from !== 'string' || typeof to !== 'string') {
      res.status(400).json({ error: 'from_and_to_query_params_are_required' });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.roster.listByRange({
        from,
        to,
        role: auth.role,
        actor: auth.actor
      });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });
}
