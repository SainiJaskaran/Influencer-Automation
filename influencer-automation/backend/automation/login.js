const { chromium } = require("playwright");
const fs = require("fs");
const paths = require("../utils/paths");
const log = require("../utils/logger");

(async () => {
  // Support per-user session via env var or command-line arg
  const userId = process.env.AUTOMATION_USER_ID || process.argv[2];
  let sessionPath;

  if (userId) {
    // Ensure sessions dir exists in DATA_DIR (writable)
    paths.sessionsDir();
    sessionPath = paths.userSessionPath(userId);
    log.info(`Saving session for user: ${userId}`);
  } else {
    // Default session — also in DATA_DIR
    sessionPath = paths.legacySessionPath();
    log.info("No user ID provided, saving to default session path");
  }

  log.info(`Session will be saved to: ${sessionPath}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: false });
  } catch (err) {
    log.error(`Failed to launch browser: ${err.message}. Ensure Chromium is installed (npx playwright install chromium).`);
    process.exit(1);
  }
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.instagram.com/");

  log.info("Login to Instagram manually in the browser... (60 seconds)");

  await page.waitForTimeout(60000);

  const cookies = await context.storageState();
  fs.writeFileSync(sessionPath, JSON.stringify(cookies));

  log.success("Session saved successfully", { path: sessionPath });

  await browser.close();
})();
