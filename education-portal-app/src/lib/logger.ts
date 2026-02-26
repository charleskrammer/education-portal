/**
 * Minimal logfmt logger.
 * Output: ts=2026-01-01T00:00:00.000Z level=info msg="hello" key=value
 */

type Fields = Record<string, string | number | boolean>;

function logfmt(fields: Fields): string {
  return Object.entries(fields)
    .map(([k, v]) => {
      const s = String(v);
      return /[\s"=]/.test(s) ? `${k}="${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : `${k}=${s}`;
    })
    .join(" ");
}

function write(level: "debug" | "info" | "warn" | "error", msg: string, extra?: Fields) {
  const line = logfmt({ ts: new Date().toISOString(), level, msg, ...extra });
  (level === "error" || level === "warn" ? process.stderr : process.stdout).write(line + "\n");
}

export const logger = {
  debug: (msg: string, extra?: Fields) => write("debug", msg, extra),
  info:  (msg: string, extra?: Fields) => write("info",  msg, extra),
  warn:  (msg: string, extra?: Fields) => write("warn",  msg, extra),
  error: (msg: string, extra?: Fields) => write("error", msg, extra),
};
