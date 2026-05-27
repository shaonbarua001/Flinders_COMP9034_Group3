import { z } from 'zod';
import { readAuth, requireRole } from '../lib/auth.js';
import { handleControllerError } from '../http/error-handler.js';
import type { ControllerContext } from './types.js';

export function registerStationController(ctx: ControllerContext): void {
  const { app, basePath, authSecret, services } = ctx;
  const requireAdmin = requireRole('admin', authSecret);

  app.post(`${basePath}/stations`, requireAdmin, async (req, res) => {
    const schema = z.object({ name: z.string().min(1), location: z.string().min(1), methodType: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.station.create({
        actor: auth.actor,
        name: parsed.data.name,
        location: parsed.data.location,
        methodType: parsed.data.methodType
      });
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.get(`${basePath}/stations`, async (_req, res) => {
    try {
      res.json(await services.station.list());
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.patch(`${basePath}/stations/:id`, requireAdmin, async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      location: z.string().min(1).optional(),
      methodType: z.string().min(1).optional(),
      active: z.boolean().optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.station.update({
        actor: auth.actor,
        id: req.params.id,
        patch: parsed.data
      });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.delete(`${basePath}/stations/:id`, requireAdmin, async (req, res) => {
    try {
      const auth = readAuth(req, authSecret);
      const result = await services.station.deactivate({ actor: auth.actor, id: req.params.id });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });
}
