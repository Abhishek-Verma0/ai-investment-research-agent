/**
 * Typed error taxonomy. Every failure in the system maps to one of these codes
 * so routes can translate it into a consistent client-facing `error` event and
 * we never throw raw strings. See docs/CONVENTIONS.md.
 */
export type AppErrorCode =
  | 'CompanyNotFound'
  | 'Ambiguous'
  | 'DataUnavailable'
  | 'ProviderError'
  | 'RateLimited'
  | 'SchemaValidation'
  | 'Timeout'
  | 'BadRequest'
  | 'Internal';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(
    code: AppErrorCode,
    message: string,
    opts: { httpStatus?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = opts.httpStatus ?? defaultStatus(code);
    this.details = opts.details;
    if (opts.cause) this.cause = opts.cause;
  }
}

function defaultStatus(code: AppErrorCode): number {
  switch (code) {
    case 'BadRequest':
    case 'Ambiguous':
      return 400;
    case 'CompanyNotFound':
    case 'DataUnavailable':
      return 404;
    case 'RateLimited':
      return 429;
    case 'Timeout':
      return 504;
    case 'ProviderError':
    case 'SchemaValidation':
    case 'Internal':
    default:
      return 500;
  }
}

/** Normalize any thrown value into an AppError. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new AppError('Internal', message, { cause: err });
}

// Error codes whose messages are user-facing and safe to expose verbatim.
const SAFE_TO_EXPOSE: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
  'CompanyNotFound',
  'Ambiguous',
  'DataUnavailable',
  'RateLimited',
  'Timeout',
  'BadRequest',
]);

/**
 * The message to send to the client. In production we replace internal/provider/
 * schema error text with a generic message so we don't leak implementation
 * detail (stack-ish strings, provider internals); the real message is still
 * logged server-side. In development we pass it through for easier debugging.
 */
export function clientMessage(err: AppError, isProd: boolean): string {
  if (!isProd || SAFE_TO_EXPOSE.has(err.code)) return err.message;
  return 'Something went wrong while researching. Please try again.';
}
