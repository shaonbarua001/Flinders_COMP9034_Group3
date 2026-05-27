import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import type { Queryable } from './db/types.js';
import type { SupabaseConfig } from './lib/runtime-config.js';
import { registerControllers } from './controllers/index.js';
import { createServices } from './services/index.js';

export interface AppConfig {
  db: Queryable;
  basePath: string;
  authSecret: string;
  supabase: SupabaseConfig;
}

export function createOpenApiSpec(basePath: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Farming Time Management API',
      version: '0.2.0'
    },
    paths: {
      [`${basePath}/health`]: { get: { summary: 'Health check' } },
      [`${basePath}/staff`]: { get: { summary: 'List staff' }, post: { summary: 'Create staff' } },
      [`${basePath}/stations`]: { get: { summary: 'List stations' }, post: { summary: 'Create station' } },
      [`${basePath}/rosters`]: { get: { summary: 'List rosters' }, post: { summary: 'Upsert rosters' } },
      [`${basePath}/time-events`]: { post: { summary: 'Submit clock event' } },
      [`${basePath}/time-events/status`]: { get: { summary: 'Get clocking status for a staff member' } },
      [`${basePath}/reports/attendance`]: { get: { summary: 'Attendance summary report' } },
      [`${basePath}/payroll/runs/generate`]: { post: { summary: 'Generate payroll run' } },
      [`${basePath}/exceptions/detect`]: { post: { summary: 'Detect compliance exceptions' } },
      [`${basePath}/integrations/supabase/status`]: { get: { summary: 'Supabase local integration status' } }
    }
  };
}

export function createApp(config: AppConfig) {
  const app = express();
  const { db, basePath, authSecret, supabase } = config;

  const openApiSpec = createOpenApiSpec(basePath);

  app.use(
    cors({
      origin: true
    })
  );
  app.use(express.json());

  app.get(`${basePath}/openapi.json`, (_req, res) => {
    res.json(openApiSpec);
  });
  app.use(`${basePath}/docs`, swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.get(`${basePath}/health`, (_req, res) => {
    res.json({ status: 'ok', service: '@farm/api', timestamp: new Date().toISOString() });
  });

  app.get('/', (_req, res) => {
    res.send('Farming Time Management API');
  });

  const services = createServices({ db, authSecret, supabase });
  registerControllers({ app, basePath, authSecret, services });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'internal_error';
    res.status(500).json({ error: message });
  });

  return app;
}
