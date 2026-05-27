export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, details?: unknown) {
    super(code);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, details?: unknown) {
    super(404, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(code: string, details?: unknown) {
    super(400, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(code: string, details?: unknown) {
    super(403, code, details);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, details?: unknown) {
    super(409, code, details);
  }
}
