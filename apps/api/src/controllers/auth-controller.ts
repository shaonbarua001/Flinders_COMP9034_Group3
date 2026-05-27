import { z } from 'zod';
import { handleControllerError } from '../http/error-handler.js';
import type { ControllerContext } from './types.js';

export function registerAuthController(ctx: ControllerContext): void {
  const { app, basePath, services } = ctx;

  app.post(`${basePath}/auth/login`, async (req, res) => {
    const schema = z.object({ staffId: z.string().min(1), password: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const session = await services.auth.login(parsed.data.staffId, parsed.data.password);
      if (!session) {
        res.status(401).json({ error: 'invalid_credentials' });
        return;
      }
      res.json(session);
    } catch (error) {
      handleControllerError(error, res);
    }
  });

  app.post(`${basePath}/auth/register`, async (req, res) => {
    const schema = z.object({
      staffId: z.string().min(1),
      name: z.string().min(1),
      role: z.enum(['admin', 'staff']),
      password: z.string().min(8)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const result = await services.auth.register(parsed.data);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(error, res);
    }
  });
}
