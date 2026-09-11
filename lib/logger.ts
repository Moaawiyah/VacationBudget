/**
 * The app's one logger — the only module that touches `console`. Each entry
 * is a single JSON line (time, level, message, fields), which Railway's log
 * viewer parses into searchable fields.
 *
 * No "@/..." imports here: scripts/ runs this file directly under Node.
 * Set LOG_LEVEL (debug | info | warn | error) to change verbosity; default info.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function isLogLevel(value: string | undefined): value is LogLevel {
  return value !== undefined && value in LEVEL_ORDER;
}

function write(level: LogLevel, message: string, fields?: LogFields): void {
  const configured = process.env.LOG_LEVEL;
  const threshold = LEVEL_ORDER[isLogLevel(configured) ? configured : "info"];
  if (LEVEL_ORDER[level] < threshold) return;
  const entry = { time: new Date().toISOString(), level, message, ...fields };
  console[level](JSON.stringify(entry));
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write("debug", message, fields),
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};
