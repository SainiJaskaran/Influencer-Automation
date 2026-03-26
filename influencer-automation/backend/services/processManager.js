const { spawn } = require("child_process");
const path = require("path");
const log = require("../utils/logger");

// Track running automation processes
const runningProcesses = {};

function startProcess(name, scriptFile) {
  if (runningProcesses[name]) {
    return { started: false, message: `${name} is already running` };
  }

  const scriptPath = path.join(__dirname, "..", "automation", scriptFile);
  const child = spawn("node", [scriptPath], {
    stdio: "pipe",
    cwd: path.join(__dirname, ".."),
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

function getRunning() {
  return Object.keys(runningProcesses);
}

module.exports = {
  startProcess,
  stopProcess,
  stopAll,
  getRunning,
};
