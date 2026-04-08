/**
 * Interactive Instagram Login Script
 *
 * Spawned as a child process per-user. Opens a visible browser,
 * waits for the user to login, detects success, saves session cookies.
 *
 * Communication with parent process via stdout JSON messages:
 *   { "event": "browser-ready" }   — browser opened, waiting for login
 *   { "event": "login-detected" }  — user logged in successfully
 *   { "event": "session-saved" }   — cookies saved to disk
 *   { "event": "timeout" }         — user didn't login in time
 *   { "event": "error", "message": "..." }
 */

const { chromium } = require("playwright");
const fs = require("fs");
const paths = require("../utils/paths");
const connectDB = require("../utils/db");

const userId = process.env.AUTOMATION_USER_ID;
if (!userId) {
  send({ event: "error", message: "No user ID provided" });
  process.exit(1);
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

const LOGIN_TIMEOUT = 120_000; // 2 minutes to login
const POLL_INTERVAL = 2_000;   // Check every 2 seconds

(async () => {
  try {
    // Connect to DB so we can verify user exists
    await connectDB();

    const sessionPath = paths.userSessionPath(userId);
    paths.sessionsDir(); // ensure dir exists

    let browser;
    try {
      browser = await chromium.launch({
        headless: false,
        args: ["--start-maximized"],
      });
    } catch (err) {
      send({ event: "error", message: `Failed to launch browser: ${err.message}. Ensure Chromium is installed.` });
      process.exit(1);
    }

    const context = await browser.newContext({
      viewport: null, // Use full window size
    });
    const page = await context.newPage();

    await page.goto("https://www.instagram.com/accounts/login/");
    send({ event: "browser-ready" });

    // Poll for login success
    const startTime = Date.now();
    let loggedIn = false;

    while (Date.now() - startTime < LOGIN_TIMEOUT) {
      await page.waitForTimeout(POLL_INTERVAL);

      try {
        // Check multiple signals that the user is logged in:
        const url = page.url();

        // 1. URL no longer on login page
        const pastLogin = !url.includes("/accounts/login") &&
                          !url.includes("/challenge") &&
                          url.includes("instagram.com");

        // 2. Check for logged-in DOM elements (profile icon, home feed)
        const hasLoggedInUI = await page.evaluate(() => {
          // Instagram shows a navigation bar with profile link when logged in
          const navLinks = document.querySelectorAll('a[href*="/direct/"], svg[aria-label="Home"]');
          return navLinks.length > 0;
        }).catch(() => false);

        if (pastLogin && hasLoggedInUI) {
          loggedIn = true;
          break;
        }

        // 3. Also detect the "Save Login Info" or "Turn on Notifications" screens
        // (these appear AFTER successful login)
        const onPostLogin = url.includes("/accounts/onetap") ||
                            url.includes("/accounts/consent");
        if (onPostLogin) {
          loggedIn = true;
          break;
        }
      } catch (_) {
        // Page might be navigating, ignore errors
      }
    }

    if (!loggedIn) {
      send({ event: "timeout" });
      await browser.close();
      process.exit(0);
    }

    send({ event: "login-detected" });

    // Give the page a moment to fully settle
    await page.waitForTimeout(3000);

    // Dismiss any popups (notifications, save login info)
    try {
      const notNow = page.locator('button:has-text("Not Now")').first();
      if (await notNow.isVisible({ timeout: 3000 })) {
        await notNow.click();
        await page.waitForTimeout(1000);
      }
    } catch (_) {}

    // Save session
    const storageState = await context.storageState();
    fs.writeFileSync(sessionPath, JSON.stringify(storageState));

    send({ event: "session-saved", path: sessionPath });

    await browser.close();
    process.exit(0);

  } catch (err) {
    send({ event: "error", message: err.message });
    process.exit(1);
  }
})();
