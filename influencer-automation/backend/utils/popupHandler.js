const log = require("./logger");

/**
 * Dismiss common Instagram popups/modals that block automation.
 * Call this after navigating to any Instagram page.
 *
 * Handles:
 *  - "Turn on Notifications?" → clicks "Not Now"
 *  - "Save Your Login Info?" → clicks "Not Now"
 *  - Cookie consent banners
 */
async function dismissPopups(page) {
  const dismissButtons = [
    // Notification popup — "Not Now" button
    'button:has-text("Not Now")',
    // Alternative notification popup selectors
    'button:has-text("not now")',
    // "Save Login Info" popup
    'button:has-text("Not Now")',
    // Cookie consent
    'button:has-text("Decline optional cookies")',
    'button:has-text("Allow essential and optional cookies")',
  ];

  for (const sel of dismissButtons) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        log.info(`Dismissed popup: ${sel}`);
        // Small wait after dismissing
        await page.waitForTimeout(1000);
      }
    } catch (_) {
      // Popup not present, move on
    }
  }
}

/**
 * Dismiss popups using role-based approach (more resilient).
 * Looks for dialog/modal roles and clicks dismiss buttons inside them.
 */
async function dismissDialogs(page) {
  try {
    // Check for any visible dialog
    const dialogs = await page.locator('div[role="dialog"]').all();

    for (const dialog of dialogs) {
      try {
        if (!(await dialog.isVisible())) continue;

        // Look for "Not Now" or dismiss buttons inside the dialog
        const notNow = dialog.locator('button:has-text("Not Now")');
        if (await notNow.isVisible({ timeout: 1500 })) {
          await notNow.click();
          log.info("Dismissed dialog via 'Not Now' button");
          await page.waitForTimeout(1000);
          continue;
        }

        // Look for close/X button inside dialog
        const closeBtn = dialog.locator('button[aria-label="Close"], svg[aria-label="Close"]').first();
        if (await closeBtn.isVisible({ timeout: 1500 })) {
          await closeBtn.click();
          log.info("Dismissed dialog via close button");
          await page.waitForTimeout(1000);
        }
      } catch (_) {}
    }
  } catch (_) {}
}

/**
 * Full popup dismissal — call both methods.
 */
async function dismissAllPopups(page) {
  await dismissPopups(page);
  await dismissDialogs(page);
}

module.exports = { dismissPopups, dismissDialogs, dismissAllPopups };
