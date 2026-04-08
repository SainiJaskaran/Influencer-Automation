const { app, BrowserWindow, shell, dialog, Tray, Menu, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const { execSync } = require("child_process");

let mainWindow;
let setupWindow;
let tray;
let server;

const PORT = 5000;

// ─── Data Directory Setup ──────────────────────────────────────────────
function getDataDir() {
  return app.getPath("userData");
}

function getEnvPath() {
  return path.join(getDataDir(), ".env");
}

function ensureDataDirs() {
  const dataDir = getDataDir();
  for (const dir of [dataDir, path.join(dataDir, "sessions")]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Check if the app has been configured (has a .env with a MongoDB URI).
 */
function isConfigured() {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) return false;
  const content = fs.readFileSync(envPath, "utf-8");
  return content.includes("MONGODB_URI=");
}

/**
 * Write config to .env file.
 */
function writeEnvFile(mongoUri, jwtSecret) {
  const envContent = [
    "# Influencer Hub Configuration",
    "",
    "MONGODB_URI=" + mongoUri,
    "JWT_SECRET=" + jwtSecret,
    "PORT=" + PORT,
    "",
  ].join("\n");
  fs.writeFileSync(getEnvPath(), envContent);
}

/**
 * Set all env vars the backend needs BEFORE requiring it.
 */
function loadEnvIntoProcess() {
  process.env.DATA_DIR = getDataDir();
  if (!process.env.PORT) process.env.PORT = String(PORT);

  // Read the .env file into process.env manually
  // (dotenv in config.js will also read it, but this ensures it's available early)
  const envPath = getEnvPath();
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }

  // Also try backend/.env for dev mode
  const backendEnv = path.join(__dirname, "..", "backend", ".env");
  if (fs.existsSync(backendEnv)) {
    const lines = fs.readFileSync(backendEnv, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

/**
 * Migrate legacy session.json to data dir.
 */
function migrateLegacyFiles() {
  const legacySession = path.join(__dirname, "..", "backend", "session.json");
  const dataSession = path.join(getDataDir(), "session.json");
  if (fs.existsSync(legacySession) && !fs.existsSync(dataSession)) {
    try { fs.copyFileSync(legacySession, dataSession); } catch (_) {}
  }
}

// ─── Setup Window (First Run) ──────────────────────────────────────────
function showSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 580,
    height: 720,
    resizable: false,
    title: "Influencer Hub — Setup",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  setupWindow.loadFile(path.join(__dirname, "setup.html"));

  // Handle config save from setup page
  ipcMain.once("save-config", async (_event, config) => {
    try {
      writeEnvFile(config.mongoUri, config.jwtSecret);
      setupWindow.close();
      setupWindow = null;
      await startApp();
    } catch (err) {
      dialog.showErrorBox("Setup Error", err.message);
    }
  });
}

// ─── Main App Window ───────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: "Influencer Hub",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Retry if server not ready yet
  mainWindow.webContents.on("did-fail-load", () => {
    setTimeout(() => mainWindow.loadURL(`http://localhost:${PORT}`), 1000);
  });

  // External links open in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http") && !url.includes("localhost")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "icon.png");
  if (!fs.existsSync(iconPath)) return;
  try { tray = new Tray(iconPath); } catch (_) { return; }

  tray.setToolTip("Influencer Hub");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Influencer Hub", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: "separator" },
    { label: "Open Data Folder", click: () => shell.openPath(getDataDir()) },
    { label: "Reconfigure Database", click: () => { shell.openPath(getEnvPath()); } },
    { type: "separator" },
    { label: "Quit", click: () => { app.isQuitting = true; mainWindow?.destroy(); app.quit(); } },
  ]));
  tray.on("click", () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ─── Playwright Browser Install ───────────────────────────────────────
function ensurePlaywrightBrowsers() {
  try {
    const { chromium } = require("playwright");
    const execPath = chromium.executablePath();
    if (fs.existsSync(execPath)) return; // Already installed
  } catch (_) {}

  // Install Chromium using Playwright's own CLI from node_modules
  // (npx won't exist on fresh Windows without Node.js installed)
  try {
    const playwrightCli = path.join(
      __dirname, "..", "backend", "node_modules", "playwright", "cli.js"
    );

    // Use Electron binary with ELECTRON_RUN_AS_NODE to run as Node.js
    const nodeBin = process.execPath;
    const env = { ...process.env, ELECTRON_RUN_AS_NODE: "1" };

    execSync(`"${nodeBin}" "${playwrightCli}" install chromium`, {
      stdio: "inherit",
      cwd: path.join(__dirname, "..", "backend"),
      env,
      timeout: 300000,
    });
  } catch (err) {
    dialog.showErrorBox(
      "Influencer Hub — Browser Setup",
      "Failed to install Chromium browser for automation.\n\n" +
        "This is required for Instagram automation to work.\n" +
        "Please check your internet connection and try restarting the app.\n\n" +
        "Error: " + (err.message || String(err))
    );
  }
}

// ─── App Start ─────────────────────────────────────────────────────────
async function startApp() {
  loadEnvIntoProcess();
  migrateLegacyFiles();
  ensurePlaywrightBrowsers();

  try {
    const { startServer } = require("../backend/server");
    server = await startServer();
    createMainWindow();
    createTray();
  } catch (err) {
    const msg = err.message || String(err);
    let hint = "";

    if (msg.includes("ECONNREFUSED") || msg.includes("MongoServerSelection")) {
      hint =
        "\n\nCannot connect to MongoDB.\n\n" +
        "Check your connection string in:\n" +
        getEnvPath() +
        "\n\nOr delete that file and restart the app to run setup again.";
    }

    dialog.showErrorBox("Influencer Hub — Startup Error", `${msg}${hint}`);
    app.quit();
  }
}

async function boot() {
  ensureDataDirs();
  // Cloud database is built-in — no setup needed. Just start.
  await startApp();
}

app.whenReady().then(boot);
app.on("window-all-closed", () => { /* tray keeps alive */ });
app.on("activate", () => mainWindow?.show());
app.on("before-quit", () => {
  app.isQuitting = true;
  try { server?.close(); } catch (_) {}
});
