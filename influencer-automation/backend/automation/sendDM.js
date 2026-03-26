const { chromium } = require("playwright");
const connectDB = require("../utils/db");
const config = require("../config");
const log = require("../utils/logger");
const { safeGoto, randomDelay } = require("../utils/safeGoto");
const { dismissAllPopups } = require("../utils/popupHandler");
const { getNewInfluencers, markContacted } = require("../services/influencerService");
const { buildOutreachMessage } = require("../services/messageService");
const { checkAndLog } = require("../services/rateLimitService");

// --- Selectors with fallbacks ---
const SELECTORS = {
  messageButton: [
    'div[role="button"]:has-text("Message")',
    'button:has-text("Message")',
  ],
  dmTextbox: [
    'div[role="textbox"]',
    'textarea[placeholder*="Message"]',
  ],
};

/**
 * Simulate human-like typing (random delay between each character).
 */
async function humanType(page, locator, text) {
  await locator.click();
  for (const char of text) {
    await page.keyboard.type(char, {
      delay: config.delays.typing.min + Math.random() * (config.delays.typing.max - config.delays.typing.min),
    });
  }
}

/**
 * Find and click the "Message" button on a profile page.
 * Uses multiple strategies with fallbacks.
 */
async function clickMessageButton(page) {
  // Strategy 1: role-based selector with text match
  for (const sel of SELECTORS.messageButton) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 5000 })) {
        await btn.click();
        log.success("Clicked Message button (selector match)");
        return true;
      }
    } catch (_) {}
  }

  // Strategy 2: scan all buttons for "message" text (original fallback)
  const buttons = await page.locator('button, div[role="button"]').all();
  for (const btn of buttons) {
    try {
      const text = await btn.innerText();
      if (text && text.toLowerCase().includes("message")) {
        await btn.click();
        log.success("Clicked Message button (text scan)");
        return true;
      }
    } catch (_) {}
  }

  return false;
}

/**
 * Find the DM textbox.
 */
async function findMessageBox(page) {
  for (const sel of SELECTORS.dmTextbox) {
    try {
      const box = page.locator(sel).first();
      await box.waitFor({ timeout: 10000 });
      if (await box.isVisible()) return box;
    } catch (_) {}
  }
  return null;
}

// --- Main DM sending flow ---

(async () => {
  await connectDB();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: config.sessionPath });
  const page = await context.newPage();

  const influencers = await getNewInfluencers(config.dmBatchSize);
  log.info(`Influencers to message: ${influencers.length}`);

  let sent = 0;

  for (const influencer of influencers) {
    const { username } = influencer;
    log.info(`Opening profile: ${username}`);

    // Rate limit check before each DM
    const rateCheck = await checkAndLog("dm_sent", { influencerUsername: username });
    if (!rateCheck.allowed) {
      log.warn(`Rate limit reached: ${rateCheck.reason}. Stopping DM session.`);
      break;
    }

    try {
      await checkAndLog("profile_visited", { influencerUsername: username });
      await safeGoto(page, `https://www.instagram.com/${username}/`);
      await page.waitForSelector("header", { timeout: 15000 });
      await dismissAllPopups(page);
      await randomDelay(page, config.delays.pageLoad);
    } catch (err) {
      log.error(`Failed to open profile: ${username}`, { error: err.message });
      continue;
    }

    // Prevent duplicate: skip if already contacted
    if (influencer.status !== "NEW") {
      log.warn(`Skipping ${username}, status is ${influencer.status}`);
      continue;
    }

    // Click the Message button
    const clicked = await clickMessageButton(page);
    if (!clicked) {
      log.warn(`Message button not found for ${username}`);
      continue;
    }

    // Dismiss any popups (notification prompt often appears here)
    await dismissAllPopups(page);

    // Find the DM textbox
    const messageBox = await findMessageBox(page);
    if (!messageBox) {
      log.warn(`DM input not found for ${username}`);
      continue;
    }

    // Generate personalized message
    const message = buildOutreachMessage(influencer);
    log.info(`Sending DM to ${username}`);

    // Type and send (human-like)
    try {
      await humanType(page, messageBox, message);
      await page.keyboard.press("Enter");
    } catch (err) {
      log.error(`Failed to send message to ${username}`, { error: err.message });
      continue;
    }

    // Update DB
    await markContacted(username, message);
    sent++;
    log.success(`DM sent to ${username} (${sent}/${influencers.length})`);

    // Human-like delay between messages
    log.info("Waiting before next message...");
    await randomDelay(page, config.delays.betweenDMs);
  }

  log.success(`DM session complete. Sent: ${sent}/${influencers.length}`);

  await browser.close();
  process.exit(0);
})();