import type express from 'express';
import { AppError } from '../domain/errors.js';

export function handleControllerError(error: unknown, res: express.Response): void {
  if (error instanceof AppError) {
    if (error.details !== undefined) {
      res.status(error.statusCode).json({ error: error.code, details: error.details });
      return;
    }
    res.status(error.statusCode).json({ error: error.code });
    return;
  }

  const message = error instanceof Error ? error.message : 'internal_error';
  res.status(500).json({ error: message });
}
