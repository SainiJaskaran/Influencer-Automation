const { chromium } = require("playwright");
const fs = require("fs");
const connectDB = require("../utils/db");
const { getConfigForAutomation } = require("../config");
const log = require("../utils/logger");
const { safeGoto, randomDelay } = require("../utils/safeGoto");
const { dismissAllPopups } = require("../utils/popupHandler");
const { getContactedInfluencers, markReplied } = require("../services/influencerService");
const { checkAndLog } = require("../services/rateLimitService");

// Build a map of contacted usernames for quick lookup
async function buildContactedMap(userId) {
  const contacted = await getContactedInfluencers(userId);
  const map = new Map();
  for (const inf of contacted) {
    map.set(inf.username.toLowerCase(), inf);
  }
  return map;
}

/**
 * Detect if the influencer has replied in this chat.
 */
async function detectReply(page, influencer) {
  try {
    await page.waitForTimeout(3000);

    const analysis = await page.evaluate(() => {
      const rows = document.querySelectorAll('div[role="row"]');
      if (rows.length === 0) return { total: 0, sent: 0, received: 0, lastReceivedText: "" };

      let containerRect = null;
      let parent = rows[0].parentElement;
      for (let i = 0; i < 10 && parent; i++) {
        const rect = parent.getBoundingClientRect();
        if (rect.width > 300) {
          containerRect = rect;
          break;
        }
        parent = parent.parentElement;
      }
      if (!containerRect) {
        containerRect = { left: 0, width: window.innerWidth };
      }

      const containerCenter = containerRect.left + containerRect.width / 2;

      let sent = 0;
      let received = 0;
      let lastReceivedText = "";

      rows.forEach((row) => {
        const textEls = row.querySelectorAll('div[dir="auto"], span[dir="auto"]');
        if (textEls.length === 0) return;

        const text = Array.from(textEls)
          .map((e) => e.textContent)
          .join(" ")
          .trim();
        if (!text) return;

        const rect = textEls[0].getBoundingClientRect();
        if (rect.width < 5 || rect.height < 5) return;

        const elCenter = rect.left + rect.width / 2;

        if (elCenter < containerCenter) {
          received++;
          lastReceivedText = text;
        } else {
          sent++;
        }
      });

      return { total: rows.length, sent, received, lastReceivedText };
    });

    log.info(`Chat analysis: ${analysis.sent} sent, ${analysis.received} received (${analysis.total} rows)`);

    if (analysis.received > 0) {
      return {
        hasReply: true,
        reason: `${analysis.received} received message(s) found (left-aligned)`,
        replyText: analysis.lastReceivedText,
      };
    }

    if (analysis.total === 0) {
      return { hasReply: false, reason: "No messages found in chat" };
    }

    return { hasReply: false, reason: `Only sent messages found (${analysis.sent} right-aligned)` };

  } catch (err) {
    log.error("Error in reply detection", { error: err.message });
    return { hasReply: false, reason: `Error: ${err.message}` };
  }
}

/**
 * Navigate directly to a specific influencer's DM thread.
 */
async function openDMThread(page, username) {
  try {
    await safeGoto(page, `https://www.instagram.com/${username}/`);
    await page.waitForTimeout(3000);
    await dismissAllPopups(page);

    const msgBtnSelectors = [
      'div[role="button"]:has-text("Message")',
      'button:has-text("Message")',
    ];

    for (const sel of msgBtnSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click();
          await page.waitForTimeout(4000);
          await dismissAllPopups(page);
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
          await page.waitForTimeout(4000);
          await dismissAllPopups(page);
          return true;
        }
      } catch (_) {}
    }
  } catch (err) {
    log.warn(`Could not open DM thread via profile for ${username}`, { error: err.message });
  }

  return false;
}

// --- Main reply checking flow ---

(async () => {
  await connectDB();

  const userId = process.env.AUTOMATION_USER_ID;
  if (!userId) {
    log.error("AUTOMATION_USER_ID not set. Cannot run reply check without user context.");
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

  // Build map of contacted influencers for lookup
  const contactedMap = await buildContactedMap(userId);
  log.info(`Tracking ${contactedMap.size} contacted influencers`);

  if (contactedMap.size === 0) {
    log.info("No contacted influencers to check");
    await browser.close();
    process.exit(0);
  }

  let repliesFound = 0;

  const contacted = await getContactedInfluencers(userId);
  log.info(`Checking replies for ${contacted.length} contacted influencers`);

  for (const influencer of contacted) {
    if (influencer.replied) {
      log.info(`Already marked as replied: ${influencer.username}`);
      continue;
    }

    log.info(`Checking: ${influencer.username}`);

    // Rate limit check
    const rateCheck = await checkAndLog(userId, "reply_checked", { influencerUsername: influencer.username });
    if (!rateCheck.allowed) {
      log.warn(`Rate limit reached: ${rateCheck.reason}. Stopping reply check.`);
      break;
    }

    const opened = await openDMThread(page, influencer.username);

    if (!opened) {
      log.warn(`Could not open DM thread for ${influencer.username}`);
      continue;
    }

    // Detect reply using message comparison
    const result = await detectReply(page, influencer);

    if (result.hasReply) {
      log.success(`Reply detected from ${influencer.username}: ${result.reason}`);
      if (result.replyText) {
        log.info(`Reply preview: "${result.replyText.substring(0, 100)}"`);
      }
      await markReplied(userId, influencer.username);
      repliesFound++;
    } else {
      log.info(`No reply from ${influencer.username}: ${result.reason}`);
    }

    await page.waitForTimeout(2000);
  }

  log.success(`Reply check complete. New replies found: ${repliesFound}`);

  await browser.close();
  process.exit(0);
})();
