const path = require("path");
const fs = require("fs");

/**
 * Centralized path resolver for all writable data.
 *
 * In Electron: DATA_DIR = %APPDATA%/Influencer Hub  (writable)
 * In dev mode: DATA_DIR = backend/                   (project dir)
 *
 * ALL file writes (sessions, settings, logs) MUST go through this module.
 * The install directory (Program Files) is READ-ONLY.
 */

const BACKEND_DIR = path.resolve(__dirname, "..");
const DATA_DIR = process.env.DATA_DIR || BACKEND_DIR;

// Ensure data sub-directories exist on first access
const _ensured = new Set();
function ensureDir(dir) {
  if (_ensured.has(dir)) return dir;
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _ensured.add(dir);
  } catch (err) {
    // Log but don't crash — caller will get the error when they try to write
    console.error(`[paths] Cannot create directory: ${dir}`, err.message);
  }
  return dir;
}

/** Root data directory (writable) */
function dataDir() {
  return ensureDir(DATA_DIR);
}

/** Sessions directory — stores Instagram browser sessions per user */
function sessionsDir() {
  return ensureDir(path.join(DATA_DIR, "sessions"));
}

/** Session file path for a specific user */
function userSessionPath(userId) {
  return path.join(sessionsDir(), `session-${userId}.json`);
}

/** Legacy single-user session path */
function legacySessionPath() {
  // Check data dir first, then backend dir (for migration)
  const inData = path.join(DATA_DIR, "session.json");
  if (fs.existsSync(inData)) return inData;
  const inBackend = path.join(BACKEND_DIR, "session.json");
  if (fs.existsSync(inBackend)) return inBackend;
  return inData; // default to data dir for new writes
}

/** Settings override file */
function settingsPath() {
  return path.join(dataDir(), "settings-override.json");
}

/** .env file path — check data dir, then backend dir */
function envPath() {
  const inData = path.join(DATA_DIR, ".env");
  if (fs.existsSync(inData)) return inData;
  const inBackend = path.join(BACKEND_DIR, ".env");
  if (fs.existsSync(inBackend)) return inBackend;
  return inData; // default to data dir
}

/** Backend source directory (read-only in production) */
function backendDir() {
  return BACKEND_DIR;
}

/** Automation scripts directory */
function automationDir() {
  return path.join(BACKEND_DIR, "automation");
}

module.exports = {
  dataDir,
  sessionsDir,
  userSessionPath,
  legacySessionPath,
  settingsPath,
  envPath,
  backendDir,
  automationDir,
  DATA_DIR,
  BACKEND_DIR,
};
