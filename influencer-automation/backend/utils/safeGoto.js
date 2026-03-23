const config = require("../config");
const log = require("./logger");

/**
 * Navigate to a URL with retry + exponential backoff.
 * Recovers from network failures and timeouts.
 */
async function safeGoto(page, url, options = {}) {
  const maxRetries = options.maxRetries || config.navigation.maxRetries;
  const timeout = options.timeout || config.navigation.timeout;
  const backoffBase = options.backoffBase || config.navigation.backoffBase;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout,
      });
      return;
    } catch (err) {
      const delay = backoffBase * Math.pow(2, attempt - 1);
      log.warn(`Navigation failed (attempt ${attempt}/${maxRetries}): ${url}`, {
        error: err.message,
        retryIn: `${delay}ms`,
      });

      if (attempt === maxRetries) {
        throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts: ${err.message}`);
      }

      await page.waitForTimeout(delay);
    }
  }
}

/**
 * Wait a random duration within configured range.
 */
async function randomDelay(page, range) {
  const ms = range.min + Math.random() * (range.max - range.min);
  await page.waitForTimeout(Math.floor(ms));
}

module.exports = { safeGoto, randomDelay };
