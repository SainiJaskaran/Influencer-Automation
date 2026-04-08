const { chromium } = require("playwright");
const fs = require("fs");
const connectDB = require("../utils/db");
const { getConfigForAutomation } = require("../config");
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
async function humanType(page, locator, text, config) {
  await locator.click();
  for (const char of text) {
    await page.keyboard.type(char, {
      delay: config.delays.typing.min + Math.random() * (config.delays.typing.max - config.delays.typing.min),
    });
  }
}

/**
 * Find and click the "Message" button on a profile page.
 */
async function clickMessageButton(page) {
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
 * Handle the "prioritised message" popup that appears on professional/business accounts.
 * Instagram shows a dialog asking to choose between prioritised or normal message.
 * We click "Send a prioritised message" to proceed.
 */
async function handlePrioritisedMessagePopup(page) {
  try {
    // Wait briefly for the popup to appear
    const dialog = page.locator('div[role="dialog"]');
    if (!(await dialog.isVisible({ timeout: 3000 }))) return false;

    // Try multiple text variations for the prioritised message button
    const prioritisedSelectors = [
      'button:has-text("Send a prioritised message")',
      'button:has-text("Prioritised")',
      'button:has-text("prioritised message")',
      'button:has-text("Send a priority message")',
      'button:has-text("Priority")',
      'div[role="button"]:has-text("Send a prioritised message")',
      'div[role="button"]:has-text("Prioritised")',
      'div[role="button"]:has-text("prioritised message")',
    ];

    for (const sel of prioritisedSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          log.success("Clicked 'Send a prioritised message' button");
          await page.waitForTimeout(2000);
          return true;
        }
      } catch (_) {}
    }

    // Fallback: look for any button inside the dialog that contains "prioriti" (case insensitive)
    try {
      const buttons = await dialog.locator('button, div[role="button"]').all();
      for (const btn of buttons) {
        const text = await btn.innerText().catch(() => "");
        if (text.toLowerCase().includes("prioriti") || text.toLowerCase().includes("priority")) {
          await btn.click();
          log.success(`Clicked prioritised message button: "${text.trim()}"`);
          await page.waitForTimeout(2000);
          return true;
        }
      }
    } catch (_) {}

    log.warn("Prioritised message popup detected but couldn't find the button");
    return false;
  } catch (_) {
    return false;
  }
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

  const userId = process.env.AUTOMATION_USER_ID;
  if (!userId) {
    log.error("AUTOMATION_USER_ID not set. Cannot run DM sending without user context.");
    process.exit(1);
  }

  const config = await getConfigForAutomation();

  if (!fs.existsSync(config.sessionPath)) {
    log.error(`No Instagram session found at ${config.sessionPath}. Run login first for this user.`);
    process.exit(1);
  }

  // Validate session file is valid JSON
  try {
    JSON.parse(fs.readFileSync(config.sessionPath, "utf-8"));
  } catch (e) {
    log.error(`Session file is corrupted: ${config.sessionPath}. Please reconnect Instagram.`);
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: false });
  } catch (err) {
    log.error(`Failed to launch browser: ${err.message}. Ensure Chromium is installed (npx playwright install chromium).`);
    process.exit(1);
  }
  const context = await browser.newContext({ storageState: config.sessionPath });
  const page = await context.newPage();

  const influencers = await getNewInfluencers(userId, config.dmBatchSize);
  log.info(`Influencers to message: ${influencers.length}`);

  let sent = 0;

  for (const influencer of influencers) {
    const { username } = influencer;
    log.info(`Opening profile: ${username}`);

    // Rate limit check before each DM
    const rateCheck = await checkAndLog(userId, "dm_sent", { influencerUsername: username });
    if (!rateCheck.allowed) {
      log.warn(`Rate limit reached: ${rateCheck.reason}. Stopping DM session.`);
      break;
    }

    try {
      await checkAndLog(userId, "profile_visited", { influencerUsername: username });
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

    // Handle prioritised message popup (professional/business accounts)
    await handlePrioritisedMessagePopup(page);

    // Dismiss any other popups
    await dismissAllPopups(page);

    // Find the DM textbox
    const messageBox = await findMessageBox(page);
    if (!messageBox) {
      log.warn(`DM input not found for ${username}`);
      continue;
    }

    // Generate personalized message
    const message = buildOutreachMessage(influencer, config.messageTemplates);
    log.info(`Sending DM to ${username}`);

    // Type and send (human-like)
    try {
      await humanType(page, messageBox, message, config);
      await page.keyboard.press("Enter");
    } catch (err) {
      log.error(`Failed to send message to ${username}`, { error: err.message });
      continue;
    }

    // Update DB
    await markContacted(userId, username, message);
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
