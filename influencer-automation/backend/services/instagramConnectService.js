const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const log = require("../utils/logger");
const paths = require("../utils/paths");

/**
 * Tracks active Instagram login sessions per user.
 * Only one login browser per user at a time.
 */
const activeLogins = {};

/**
 * Start an Instagram login browser for a user.
 * Returns a promise-like object with status updates.
 */
function startLoginBrowser(userId) {
  if (activeLogins[userId]) {
    return { started: false, message: "Login browser already open for this user" };
  }

  const scriptPath = path.join(paths.automationDir(), "connectInstagram.js");
  const env = { ...process.env, AUTOMATION_USER_ID: userId.toString(), DATA_DIR: paths.DATA_DIR };

  // Use Electron's Node runtime if in Electron
  let nodeBin = "node";
  if (process.versions && process.versions.electron) {
    nodeBin = process.execPath;
    env.ELECTRON_RUN_AS_NODE = "1";
  }

  const child = spawn(nodeBin, [scriptPath], {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: paths.backendDir(),
    env,
  });

  const loginState = {
    userId,
    child,
    status: "waiting", // waiting | login-detected | saved | timeout | error
    startedAt: Date.now(),
    message: "Browser opened — waiting for Instagram login",
  };

  activeLogins[userId] = loginState;

  // Parse JSON messages from the child process
  let buffer = "";
  child.stdout.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        log.info(`[instagram-connect:${userId}]`, msg);

        switch (msg.event) {
          case "browser-ready":
            loginState.status = "waiting";
            loginState.message = "Browser opened — log into Instagram";
            break;
          case "login-detected":
            loginState.status = "login-detected";
            loginState.message = "Login detected — saving session...";
            break;
          case "session-saved":
            loginState.status = "saved";
            loginState.message = "Instagram connected successfully";
            break;
          case "timeout":
            loginState.status = "timeout";
            loginState.message = "Login timed out — browser closed";
            break;
          case "error":
            loginState.status = "error";
            loginState.message = msg.message || "Unknown error";
            break;
        }
      } catch (_) {
        // Not JSON, just log output
        log.info(`[instagram-connect:${userId}] ${line}`);
      }
    }
  });

  child.stderr.on("data", (data) => {
    log.error(`[instagram-connect:${userId}] ${data.toString().trim()}`);
  });

  child.on("close", (code) => {
    log.info(`[instagram-connect:${userId}] Process exited with code ${code}`);
    if (loginState.status === "waiting") {
      loginState.status = code === 0 ? "timeout" : "error";
      loginState.message = code === 0 ? "Browser closed" : "Login process failed";
    }
    // Keep in activeLogins for a bit so status can be polled, then clean up
    setTimeout(() => {
      delete activeLogins[userId];
    }, 30_000);
  });

  child.on("error", (err) => {
    log.error(`[instagram-connect:${userId}] Spawn error`, { error: err.message });
    loginState.status = "error";
    loginState.message = `Failed to open browser: ${err.message}`;
    delete activeLogins[userId];
  });

  return { started: true, message: "Login browser opening — switch to the browser window to login" };
}

/**
 * Get the login status for a user.
 */
function getLoginStatus(userId) {
  const login = activeLogins[userId];
  if (!login) {
    return { active: false };
  }
  return {
    active: true,
    status: login.status,
    message: login.message,
    elapsed: Math.round((Date.now() - login.startedAt) / 1000),
  };
}

/**
 * Cancel an active login browser.
 */
function cancelLogin(userId) {
  const login = activeLogins[userId];
  if (!login) {
    return { cancelled: false, message: "No active login session" };
  }
  try {
    login.child.kill("SIGTERM");
  } catch (_) {}
  delete activeLogins[userId];
  return { cancelled: true, message: "Login cancelled" };
}

/**
 * Disconnect Instagram — delete ALL session files for this user.
 */
function disconnectInstagram(userId) {
  let deleted = false;
  const errors = [];

  // Delete per-user session
  const sessionPath = paths.userSessionPath(userId);
  try {
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
      deleted = true;
    }
  } catch (err) {
    errors.push(err.message);
  }

  // Also delete legacy session (since ensureUserSession would copy it back)
  const legacyPath = paths.legacySessionPath();
  try {
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
      deleted = true;
    }
  } catch (err) {
    errors.push(err.message);
  }

  if (deleted) {
    log.info("Instagram session deleted", { userId });
    return { disconnected: true, message: "Instagram disconnected" };
  }
  if (errors.length) {
    return { disconnected: false, message: `Failed: ${errors.join(", ")}` };
  }
  return { disconnected: false, message: "No session found" };
}

module.exports = {
  startLoginBrowser,
  getLoginStatus,
  cancelLogin,
  disconnectInstagram,
};
