const { chromium } = require("playwright");
const connectDB = require("../utils/db");
const config = require("../config");
const log = require("../utils/logger");
const { safeGoto, randomDelay } = require("../utils/safeGoto");
const { dismissAllPopups } = require("../utils/popupHandler");
const { getContactedInfluencers, markReplied } = require("../services/influencerService");
const { checkAndLog } = require("../services/rateLimitService");

// Build a map of contacted usernames for quick lookup
async function buildContactedMap() {
  const contacted = await getContactedInfluencers();
  const map = new Map();
  for (const inf of contacted) {
    map.set(inf.username.toLowerCase(), inf);
  }
  return map;
}

/**
 * Detect if the influencer has replied in this chat.
 *
 * Uses VISUAL POSITION to distinguish sent vs received messages:
 *   - OUR sent messages are RIGHT-aligned in the chat area
 *   - THEIR received messages are LEFT-aligned in the chat area
 *
 * We use page.evaluate() to get the bounding rect of each message bubble
 * and compare its horizontal center against the chat container's center.
 * Left of center = received (reply). Right of center = sent (ours).
 */
async function detectReply(page, influencer) {
  try {
    await page.waitForTimeout(3000);

    const analysis = await page.evaluate(() => {
      // Find all message rows
      const rows = document.querySelectorAll('div[role="row"]');
      if (rows.length === 0) return { total: 0, sent: 0, received: 0, lastReceivedText: "" };

      // Walk up from the first row to find the chat container (a parent with reasonable width)
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
        // Find actual text bubbles inside each row
        const textEls = row.querySelectorAll('div[dir="auto"], span[dir="auto"]');
        if (textEls.length === 0) return;

        // Collect text content
        const text = Array.from(textEls)
          .map((e) => e.textContent)
          .join(" ")
          .trim();
        if (!text) return;

        // Use the first text element's bounding rect to determine side
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
 * This is more reliable than finding them in the inbox list.
 */
async function openDMThread(page, username) {
  // Strategy 1: Use Instagram's direct message URL shortcut
  // Navigate to user profile and click Message button
  try {
    await safeGoto(page, `https://www.instagram.com/${username}/`);
    await page.waitForTimeout(3000);
    await dismissAllPopups(page);

    // Look for Message button
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

    // Scan all buttons for "message" text
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

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: config.sessionPath });
  const page = await context.newPage();

  // Build map of contacted influencers for lookup
  const contactedMap = await buildContactedMap();
  log.info(`Tracking ${contactedMap.size} contacted influencers`);

  if (contactedMap.size === 0) {
    log.info("No contacted influencers to check");
    await browser.close();
    process.exit(0);
  }

  let repliesFound = 0;

  // ─── Strategy: Open each contacted influencer's DM directly ───
  // Instead of relying on finding chats in the inbox list (which breaks
  // when Instagram changes DOM), we go to each influencer's profile
  // and click "Message" to open the existing thread.

  const contacted = await getContactedInfluencers();
  log.info(`Checking replies for ${contacted.length} contacted influencers`);

  for (const influencer of contacted) {
    if (influencer.replied) {
      log.info(`Already marked as replied: ${influencer.username}`);
      continue;
    }

    log.info(`Checking: ${influencer.username}`);

    // Rate limit check
    const rateCheck = await checkAndLog("reply_checked", { influencerUsername: influencer.username });
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
      await markReplied(influencer.username);
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