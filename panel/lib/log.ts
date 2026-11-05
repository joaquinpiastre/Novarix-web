type Level = "info" | "warn" | "error";

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  const line = { level, msg, ts: new Date().toISOString(), ...meta };
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  out(JSON.stringify(line));
}

export const log = {
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};
