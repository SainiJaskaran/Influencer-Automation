const { chromium } = require("playwright");
const config = require("./config");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: config.sessionPath,
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  try {
    // Open a gaming post
    await page.goto("https://www.instagram.com/explore/tags/gaming/");
    await page.waitForTimeout(3000);

    // Get first post URL
    const postLink = await page.locator('a[href*="/p/"], a[href*="/reel/"]').first();
    const href = await postLink.getAttribute("href");
    const postUrl = `https://www.instagram.com${href}`;

    console.log(`Opening post: ${postUrl}`);
    await page.goto(postUrl);
    await page.waitForTimeout(4000);

    // Take a screenshot
    await page.screenshot({ path: "/c/Users/onkar/OneDrive/Desktop/influencer-automation/post-screenshot.png" });
    console.log("Screenshot saved to post-screenshot.png");

    // Get all the page info
    const pageInfo = await page.evaluate(() => {
      const info = {
        url: window.location.href,
        title: document.title,
        body_html: document.body.innerHTML.substring(0, 2000), // First 2000 chars
        all_links: Array.from(document.querySelectorAll("a"))
          .map(a => ({
            href: a.getAttribute("href"),
            text: a.textContent.trim().substring(0, 30),
            visible: a.offsetParent !== null
          }))
          .filter(l => l.href && l.href.startsWith("/"))
          .slice(0, 20),
        headers: Array.from(document.querySelectorAll("header")).length,
        articles: Array.from(document.querySelectorAll("article")).length,
        dialogs: Array.from(document.querySelectorAll("[role='dialog']")).length
      };
      return info;
    });

    console.log("\n=== PAGE STRUCTURE ===");
    console.log(JSON.stringify(pageInfo, null, 2));

    // Now specifically look for username
    const usernameInfo = await page.evaluate(() => {
      const info = { methods: {} };

      // Method 1: Header links
      info.methods.header_links = Array.from(document.querySelectorAll("header a"))
        .map(a => ({ href: a.getAttribute("href"), text: a.textContent.substring(0, 30) }));

      // Method 2: All profile-like links (/username)
      info.methods.profile_style_links = Array.from(document.querySelectorAll("a"))
        .map(a => a.getAttribute("href"))
        .filter(href => href && /^\/[a-zA-Z0-9._-]+\/?$/.test(href))
        .slice(0, 10);

      // Method 3: Check for specific selectors
      info.methods.selector_check = {
        "header a[role='link'][href^='/']": Array.from(document.querySelectorAll("header a[role='link'][href^='/']")).length,
        "header a[href^='/']": Array.from(document.querySelectorAll("header a[href^='/']")).length,
        "article a[href^='/']": Array.from(document.querySelectorAll("article a[href^='/']")).length
      };

      return info;
    });

    console.log("\n=== USERNAME EXTRACTION INFO ===");
    console.log(JSON.stringify(usernameInfo, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    console.log("\nBrowser still open - inspect the page and press Ctrl+C when done");
    // Keep browser open so user can inspect
    await new Promise(() => {});
  }
})();
