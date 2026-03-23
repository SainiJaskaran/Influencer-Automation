const { chromium } = require("playwright");
const config = require("../config");
const log = require("../utils/logger");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: config.sessionPath });
  const page = await context.newPage();

  await page.goto("https://www.instagram.com/");

  log.success("Session loaded successfully");

  await browser.close();
})();