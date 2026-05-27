import type express from 'express';
import type { AppServices } from '../services/index.js';

export interface ControllerContext {
  app: express.Express;
  basePath: string;
  authSecret: string;
  services: AppServices;
}
