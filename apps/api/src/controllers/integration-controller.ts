import { requireRole } from '../lib/auth.js';
import { handleControllerError } from '../http/error-handler.js';
import type { ControllerContext } from './types.js';

export function registerIntegrationController(ctx: ControllerContext): void {
  const { app, basePath, authSecret, services } = ctx;
  const requireAdmin = requireRole('admin', authSecret);

  app.get(`${basePath}/integrations/supabase/status`, requireAdmin, async (_req, res) => {
    try {
      const status = await services.integration.getSupabaseStatus();
      res.json(status);
    } catch (error) {
      handleControllerError(error, res);
    }
  });
}
