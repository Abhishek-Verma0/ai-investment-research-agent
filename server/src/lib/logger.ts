/**
 * Minimal structured logger. Emits single-line JSON so logs are greppable and
 * machine-parseable in any host (Render, Vercel, local). A run-scoped `traceId`
 * can be threaded through via `child()` so every line of one research run is
 * correlatable. Secrets and full LLM payloads must never be logged.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

type Fields = Record<string, unknown>;

function emit(level: Level, msg: string, base: Fields, extra?: Fields) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...base,
    ...extra,
  };
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  out(JSON.stringify(line));
}

export interface Logger {
  debug(msg: string, extra?: Fields): void;
  info(msg: string, extra?: Fields): void;
  warn(msg: string, extra?: Fields): void;
  error(msg: string, extra?: Fields): void;
  child(fields: Fields): Logger;
}

export function createLogger(base: Fields = {}): Logger {
  return {
    debug: (msg, extra) => emit('debug', msg, base, extra),
    info: (msg, extra) => emit('info', msg, base, extra),
    warn: (msg, extra) => emit('warn', msg, base, extra),
    error: (msg, extra) => emit('error', msg, base, extra),
    child: (fields) => createLogger({ ...base, ...fields }),
  };
}

export const logger = createLogger();
