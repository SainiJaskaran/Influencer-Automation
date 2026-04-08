const fs = require("fs");
const paths = require("../utils/paths");
const log = require("../utils/logger");

/**
 * Check if a user has a valid session file.
 * If not, try to copy from the legacy session.json.
 * Returns { exists: boolean, path: string, error?: string }
 */
function ensureUserSession(userId) {
  const userSessionPath = paths.userSessionPath(userId);

  // Already has a per-user session
  if (fs.existsSync(userSessionPath)) {
    try {
      const content = fs.readFileSync(userSessionPath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && (parsed.cookies || parsed.origins)) {
        return { exists: true, path: userSessionPath };
      }
    } catch (_) {
      // File exists but is corrupt/empty, fall through to try legacy
    }
  }

  // Try to copy from legacy session.json
  const legacyPath = paths.legacySessionPath();
  if (fs.existsSync(legacyPath)) {
    try {
      const content = fs.readFileSync(legacyPath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && (parsed.cookies || parsed.origins)) {
        // Ensure sessions directory exists (in DATA_DIR, writable)
        paths.sessionsDir();
        fs.copyFileSync(legacyPath, userSessionPath);
        log.info("Copied legacy session.json to user session", { userId });
        return { exists: true, path: userSessionPath };
      }
    } catch (_) {
      // Legacy session is corrupt
    }
  }

  return {
    exists: false,
    path: userSessionPath,
    error: "No Instagram session found. Please run the login script first: npm run login",
  };
}

/**
 * Get session status for a user.
 */
function getSessionStatus(userId) {
  const userSessionPath = paths.userSessionPath(userId);
  const hasUserSession = fs.existsSync(userSessionPath);
  const legacyPath = paths.legacySessionPath();
  const hasLegacySession = fs.existsSync(legacyPath);

  let sessionAge = null;
  const checkPath = hasUserSession ? userSessionPath : (hasLegacySession ? legacyPath : null);
  if (checkPath) {
    try {
      const stat = fs.statSync(checkPath);
      sessionAge = Date.now() - stat.mtimeMs;
    } catch (_) {}
  }

  return {
    hasSession: hasUserSession || hasLegacySession,
    hasUserSession,
    hasLegacySession,
    sessionPath: userSessionPath,
    sessionAgeDays: sessionAge ? Math.round(sessionAge / (1000 * 60 * 60 * 24)) : null,
    stale: sessionAge ? sessionAge > 7 * 24 * 60 * 60 * 1000 : true,
  };
}

module.exports = { ensureUserSession, getSessionStatus };
