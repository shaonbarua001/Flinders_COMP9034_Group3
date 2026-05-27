import { z } from 'zod';
import { readAuth, requireRole } from '../lib/auth.js';
import { handleControllerError } from '../http/error-handler.js';
import type { ControllerContext } from './types.js';

export function registerStaffController(ctx: ControllerContext): void {
  const { app, basePath, authSecret, services } = ctx;
  const requireAdmin = requireRole('admin', authSecret);

  app.post(`${basePath}/staff`, requireAdmin, async (req, res) => {
    const schema = z.object({
      staffId: z.string().min(1),
      name: z.string().min(1),
      contractType: z.enum(['casual', 'part_time', 'full_time']),
      standardHours: z.number().positive(),
      role: z.enum(['admin', 'staff']),
      standardRate: z.number().positive(),
      overtimeRate: z.number().positive(),
      password: z.string().min(8).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.staff.create({ actor: auth.actor, ...parsed.data });
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.get(`${basePath}/staff`, requireAdmin, async (_req, res) => {
    try {
      const result = await services.staff.list();
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.patch(`${basePath}/staff/:staffId`, requireAdmin, async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      contractType: z.enum(['casual', 'part_time', 'full_time']).optional(),
      standardHours: z.number().positive().optional(),
      role: z.enum(['admin', 'staff']).optional(),
      standardRate: z.number().positive().optional(),
      overtimeRate: z.number().positive().optional(),
      active: z.boolean().optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.staff.update({
        actor: auth.actor,
        staffId: req.params.staffId,
        patch: parsed.data
      });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.delete(`${basePath}/staff/:staffId`, requireAdmin, async (req, res) => {
    try {
      const auth = readAuth(req, authSecret);
      const result = await services.staff.deactivate({ actor: auth.actor, staffId: req.params.staffId });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.put(`${basePath}/staff/:staffId/identity-methods/:methodType`, requireAdmin, async (req, res) => {
    const schema = z.object({ status: z.string().min(1), externalRef: z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const auth = readAuth(req, authSecret);
      const result = await services.staff.upsertIdentity({
        actor: auth.actor,
        staffId: req.params.staffId,
        methodType: req.params.methodType,
        status: parsed.data.status,
        externalRef: parsed.data.externalRef
      });
      res.json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });
}
