const { chromium } = require("playwright");
const fs = require("fs");
const config = require("../config");
const log = require("../utils/logger");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.instagram.com/");

  log.info("Login to Instagram manually in the browser... (60 seconds)");

  await page.waitForTimeout(60000);

  const cookies = await context.storageState();
  fs.writeFileSync(config.sessionPath, JSON.stringify(cookies));

  log.success("Session saved successfully", { path: config.sessionPath });

  await browser.close();
})();