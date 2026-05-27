import { z } from 'zod';
import { readAuth, requireRole } from '../lib/auth.js';
import { handleControllerError } from '../http/error-handler.js';
import type { ControllerContext } from './types.js';

export function registerExceptionController(ctx: ControllerContext): void {
  const { app, basePath, authSecret, services } = ctx;
  const requireAdmin = requireRole('admin', authSecret);

  app.post(`${basePath}/exceptions/detect`, requireAdmin, async (req, res) => {
    const schema = z.object({ from: z.string().min(10), to: z.string().min(10) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.exception.detect({ actor: auth.actor, ...parsed.data });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.get(`${basePath}/exceptions`, requireAdmin, async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    try {
      res.json(await services.exception.list({ status }));
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.patch(`${basePath}/exceptions/:id/resolve`, requireAdmin, async (req, res) => {
    const schema = z.object({ notes: z.string().min(1).optional() });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.exception.resolve({
        actor: auth.actor,
        id: req.params.id,
        notes: parsed.data.notes
      });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });
}
