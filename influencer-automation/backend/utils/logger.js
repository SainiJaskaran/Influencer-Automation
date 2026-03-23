const LEVELS = { INFO: "INFO", SUCCESS: "SUCCESS", WARN: "WARN", ERROR: "ERROR" };

function formatTimestamp() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  const ts = formatTimestamp();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
  console.log(`[${ts}] [${level}] ${message}${metaStr}`);
}

module.exports = {
  info: (msg, meta) => log(LEVELS.INFO, msg, meta),
  success: (msg, meta) => log(LEVELS.SUCCESS, msg, meta),
  warn: (msg, meta) => log(LEVELS.WARN, msg, meta),
  error: (msg, meta) => log(LEVELS.ERROR, msg, meta),
};
