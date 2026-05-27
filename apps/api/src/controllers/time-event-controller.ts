import { z } from 'zod';
import { readAuth, requireRole } from '../lib/auth.js';
import { handleControllerError } from '../http/error-handler.js';
import type { ControllerContext } from './types.js';

export function registerTimeEventController(ctx: ControllerContext): void {
  const { app, basePath, authSecret, services } = ctx;
  const requireAdmin = requireRole('admin', authSecret);

  app.get(`${basePath}/time-events/status`, async (req, res) => {
    const schema = z.object({
      staffId: z.string().min(1)
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await services.timeEvent.getStatus({ staffId: parsed.data.staffId });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.post(`${basePath}/time-events`, async (req, res) => {
    const schema = z.object({
      staffId: z.string().min(1),
      stationId: z.number().int().optional(),
      eventType: z.enum(['clock_in', 'clock_out', 'break_start', 'break_end']),
      methodType: z.enum(['card', 'face', 'fingerprint', 'retinal']),
      timestamp: z.string().datetime(),
      breakType: z.enum(['tea', 'lunch', 'safety']).optional(),
      reason: z.string().optional()
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.timeEvent.create({ actor: auth.actor, isManual: false, ...parsed.data });
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.post(`${basePath}/time-events/manual`, requireAdmin, async (req, res) => {
    const schema = z.object({
      staffId: z.string().min(1),
      stationId: z.number().int().optional(),
      eventType: z.enum(['clock_in', 'clock_out', 'break_start', 'break_end']),
      timestamp: z.string().datetime(),
      reason: z.string().min(3),
      methodType: z.enum(['card', 'face', 'fingerprint', 'retinal']).default('card')
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.timeEvent.create({
        actor: auth.actor,
        staffId: parsed.data.staffId,
        stationId: parsed.data.stationId,
        eventType: parsed.data.eventType,
        methodType: parsed.data.methodType,
        timestamp: parsed.data.timestamp,
        reason: parsed.data.reason,
        isManual: true
      });
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });
}
