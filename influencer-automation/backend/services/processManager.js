const { spawn } = require("child_process");
const path = require("path");
const log = require("../utils/logger");
const paths = require("../utils/paths");

// Track running automation processes
const runningProcesses = {};

/**
 * Determine the Node.js executable path.
 * In Electron: use process.execPath with ELECTRON_RUN_AS_NODE=1
 * In dev: use "node" from PATH
 */
function getNodeBin() {
  // If running inside Electron, process.versions.electron exists
  if (process.versions && process.versions.electron) {
    return process.execPath; // Electron binary, used with ELECTRON_RUN_AS_NODE
  }
  return "node";
}

function startProcess(name, scriptFile, userId) {
  if (runningProcesses[name]) {
    return { started: false, message: `${name} is already running` };
  }

  const scriptPath = path.join(paths.automationDir(), scriptFile);
  const env = { ...process.env };

  // Critical: Tell Electron binary to act as Node.js
  if (process.versions && process.versions.electron) {
    env.ELECTRON_RUN_AS_NODE = "1";
  }

  if (userId) {
    env.AUTOMATION_USER_ID = userId.toString();
  }

  // Pass DATA_DIR to child process so it writes to the correct location
  env.DATA_DIR = paths.DATA_DIR;

  const nodeBin = getNodeBin();
  const child = spawn(nodeBin, [scriptPath], {
    stdio: "pipe",
    cwd: paths.backendDir(),
    env,
  });

  runningProcesses[name] = child;

  child.stdout.on("data", (data) => {
    log.info(`[${name}] ${data.toString().trim()}`);
  });

  child.stderr.on("data", (data) => {
    log.error(`[${name}] ${data.toString().trim()}`);
  });

  child.on("close", (code) => {
    log.info(`[${name}] Process exited with code ${code}`);
    delete runningProcesses[name];
  });

  child.on("error", (err) => {
    log.error(`[${name}] Process error`, { error: err.message });
    delete runningProcesses[name];
  });

  return { started: true, message: `${name} started` };
}

function stopProcess(name) {
  const child = runningProcesses[name];
  if (!child) {
    return { stopped: false, message: `${name} is not running` };
  }
  child.kill("SIGTERM");
  delete runningProcesses[name];
  return { stopped: true, message: `${name} stopped` };
}

function stopAll() {
  const stopped = [];
  for (const [procName, child] of Object.entries(runningProcesses)) {
    child.kill("SIGTERM");
    delete runningProcesses[procName];
    stopped.push(procName);
  }
  return stopped;
}

function stopAllForUser(userId) {
  const prefix = userId.toString() + "-";
  const stopped = [];
  for (const [procName, child] of Object.entries(runningProcesses)) {
    if (procName.startsWith(prefix)) {
      child.kill("SIGTERM");
      delete runningProcesses[procName];
      stopped.push(procName);
    }
  }
  return stopped;
}

function getRunning() {
  return Object.keys(runningProcesses);
}

function getRunningForUser(userId) {
  const prefix = userId.toString() + "-";
  return Object.keys(runningProcesses).filter((name) => name.startsWith(prefix));
}

module.exports = {
  startProcess,
  stopProcess,
  stopAll,
  stopAllForUser,
  getRunning,
  getRunningForUser,
};
