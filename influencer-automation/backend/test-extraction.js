const { chromium } = require("playwright");
const config = require("./config");

// Simulate the extraction function
async function testExtraction(page) {
  const extractionResult = await page.evaluate(() => {
    // Get all links matching /username/ pattern
    const allLinks = Array.from(document.querySelectorAll("a"))
      .map(a => a.getAttribute("href"))
      .filter(href => href && /^\/[a-zA-Z0-9._-]+\/?$/.test(href))
      .map(href => href.replace(/\//g, ""));

    // Filter out special/system pages
    const specialPages = ["explore", "accounts", "direct", "notifications", "stories", "saved", "tagged", "tv", "reels", "p", "app", "api", "about", "help", "press", "channel", ""];
    const validUsernames = allLinks.filter(u => !specialPages.includes(u.toLowerCase()) && u.length > 0);

    // Count occurrences of each username - creator appears multiple times
    const usernameCount = {};
    validUsernames.forEach(u => {
      usernameCount[u] = (usernameCount[u] || 0) + 1;
    });

    // Get unique usernames sorted by frequency (most common = creator)
    const uniqueUsernames = Object.entries(usernameCount)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(entry => entry[0]);

    return {
      allValid: validUsernames,
      unique: uniqueUsernames,
      counts: usernameCount,
      first: validUsernames[0] || null,
      mostFrequent: uniqueUsernames[0] || null
    };
  });

  return extractionResult;
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: config.sessionPath });
  const page = await context.newPage();

  try {
    console.log("=== TESTING USERNAME EXTRACTION ===\n");

    // Open hashtag page
    console.log("1. Opening #gaming hashtag page...");
    await page.goto("https://www.instagram.com/explore/tags/gaming/");
    await page.waitForTimeout(3000);

    // Get first post URL
    const postLink = await page.locator('a[href*="/p/"], a[href*="/reel/"]').first();
    const href = await postLink.getAttribute("href");
    const postUrl = `https://www.instagram.com${href}`;

    console.log(`2. Opening post: ${postUrl}`);
    await page.goto(postUrl);
    await page.waitForTimeout(4000);

    // Test extraction
    console.log("3. Running extraction...\n");
    const result = await testExtraction(page);

    console.log("=== EXTRACTION RESULTS ===\n");
    console.log("All valid usernames found:", result.allValid);
    console.log("\nUsername frequency count:", result.counts);
    console.log("\nMost frequent (should be creator):", result.mostFrequent);
    console.log("First username (likely logged-in user):", result.first);

    if (result.mostFrequent) {
      console.log(`\n✅ SUCCESS: Extracted creator username: @${result.mostFrequent}`);
    } else {
      console.log(`\n❌ FAILED: Could not extract username`);
    }

  } catch (err) {
    console.error("Error during test:", err);
  } finally {
    console.log("\nBrowser still open - inspect and press Ctrl+C when done");
    // Keep browser open
    await new Promise(() => {});
  }
})();
