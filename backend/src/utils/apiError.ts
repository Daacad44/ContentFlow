/**
 * src/utils/apiError.ts
 * Typed operational errors. Anything thrown as an ApiError is "expected" and
 * mapped to a clean HTTP response by the global error handler. Unexpected
 * errors are treated as 500s and never leak internals to the client.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code = 'ERROR',
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details?: unknown) {
    return new ApiError(400, msg, 'BAD_REQUEST', details);
  }
  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(401, msg, 'UNAUTHORIZED');
  }
  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg, 'FORBIDDEN');
  }
  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg, 'NOT_FOUND');
  }
  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg, 'CONFLICT');
  }
  static tooMany(msg = 'Too many requests') {
    return new ApiError(429, msg, 'RATE_LIMITED');
  }
  static internal(msg = 'Internal server error') {
    return new ApiError(500, msg, 'INTERNAL_ERROR');
  }
  static serviceUnavailable(msg = 'Service unavailable') {
    return new ApiError(503, msg, 'SERVICE_UNAVAILABLE');
  }
}
