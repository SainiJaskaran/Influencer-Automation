const { chromium } = require("playwright");
const connectDB = require("../utils/db");
const { getConfigForAutomation } = require("../config");
const log = require("../utils/logger");
const { safeGoto, randomDelay } = require("../utils/safeGoto");
const { dismissAllPopups } = require("../utils/popupHandler");
const { parseFollowers, passesFilters } = require("../utils/parser");
const { saveInfluencer } = require("../services/influencerService");
const { analyzeInfluencer } = require("../utils/influencerAnalyzer");
const { checkAndLog } = require("../services/rateLimitService");

const fs = require("fs");

const processedUsers = new Set();
let config; // assigned in the IIFE after DB connect

// --- Selectors with fallbacks ---
const SELECTORS = {
  postLinks: 'a[href*="/p/"], a[href*="/reel/"]',
  // Multiple strategies to extract username from a post modal
  postUsername: [
    'header a[role="link"][href^="/"]',
    'header a[href^="/"]',
    'article a[href^="/"]',
  ],
  // Multiple strategies to extract follower count
  followers: [
    'a[href$="/followers/"] span',
    'a[href*="/followers"] span',
    'header ul li:nth-child(2) span',
  ],
  // Bio extraction
  bio: [
    'header section div > span',
    'header section',
  ],
  // Post links on profile page (for engagement scraping)
  profilePosts: 'a[href*="/p/"], a[href*="/reel/"]',
  // Likes count inside a post
  postLikes: [
    'section span:has-text("likes")',
    'section a:has-text("likes") span',
    'button:has-text("likes") span',
    'span:has-text("like")',
  ],
};

/**
 * Try multiple selectors in order, return first match.
 */
async function trySelectors(page, selectors, action = "textContent") {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 })) {
        if (action === "textContent") return await el.textContent();
        if (action === "getAttribute") return await el.getAttribute("href");
        if (action === "innerText") return await el.innerText();
      }
    } catch (_) {
      // try next selector
    }
  }
  return null;
}

/**
 * Scroll multiple times to load more posts (handles lazy loading).
 */
async function scrollToLoadPosts(page, scrollCount = 3) {
  for (let s = 0; s < scrollCount; s++) {
    await page.mouse.wheel(0, 2000 + Math.random() * 1000);
    await randomDelay(page, config.delays.afterScroll);
  }
}

/**
 * Extract username from a post modal using multiple strategies.
 * Instagram's DOM is heavily JavaScript-rendered, so we need robust extraction.
 */
async function extractUsernameFromPost(page) {
  try {
    // Strategy: Extract creator username from profile-style links on the page
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

    log.info(`Username extraction debug`, {
      uniqueCount: extractionResult.unique.length,
      counts: extractionResult.counts,
      mostFrequent: extractionResult.mostFrequent,
      first: extractionResult.first
    });

    // Prefer the most frequently appearing username (the creator)
    const username = extractionResult.mostFrequent || extractionResult.first;

    if (username) {
      log.info(`✓ Extracted username: @${username}`);
      return username;
    }

    // Fallback: Try to extract from URL if this is a direct post page
    const currentUrl = page.url();
    const urlMatch = currentUrl.match(/https:\/\/www\.instagram\.com\/(?:p|reel)\/([^\/]+)\//);
    if (urlMatch) {
      log.warn(`Could not extract username from links on post ${urlMatch[1]}. Page structure may have changed.`);
    }

    return null;

  } catch (err) {
    log.warn("Error extracting username from post", { error: err.message, stack: err.stack });
    return null;
  }
}

/**
 * Extract follower count from profile page.
 */
async function extractFollowers(page) {
  const raw = await trySelectors(page, SELECTORS.followers, "textContent");
  if (!raw) return 0;
  return parseFollowers(raw);
}

/**
 * Extract bio text from profile page.
 */
async function extractBio(page) {
  const bio = await trySelectors(page, SELECTORS.bio, "innerText");
  return bio || "";
}

/**
 * Scrape engagement data from a profile's recent posts.
 * Opens up to 3 posts, extracts likes count from each.
 * Returns { avgLikes, avgComments } (comments estimated as likes * 0.03).
 */
async function scrapeEngagement(page, username) {
  try {
    // Get post links on the profile page
    const postLinkLocators = await page.locator(SELECTORS.profilePosts).all();
    if (postLinkLocators.length === 0) {
      log.warn("No posts found on profile for engagement", { username });
      return { avgLikes: 0, avgComments: 0 };
    }

    const postsToCheck = Math.min(postLinkLocators.length, 3);
    const likesArr = [];

    for (let p = 0; p < postsToCheck; p++) {
      try {
        // Re-query since DOM refreshes after navigation
        const currentPostLocators = await page.locator(SELECTORS.profilePosts).all();
        if (!currentPostLocators[p]) break;

        await currentPostLocators[p].click();
        await randomDelay(page, config.delays.pageLoad);

        // Try to extract likes from the post modal
        let likesCount = 0;
        const likesText = await page.evaluate(() => {
          // Strategy 1: look for "X likes" text
          const spans = document.querySelectorAll("span");
          for (const span of spans) {
            const text = span.textContent || "";
            if (/^[\d,.\s]+likes?$/i.test(text.trim())) {
              return text.trim();
            }
            // "Liked by X and Y others" pattern
            const othersMatch = text.match(/([\d,.\w]+)\s+others?/i);
            if (othersMatch) return othersMatch[1];
          }
          // Strategy 2: look for the likes section/button
          const likesSection = document.querySelector('section a[href*="liked_by"] span');
          if (likesSection) return likesSection.textContent;
          return "";
        });

        if (likesText) {
          likesCount = parseFollowers(likesText.replace(/likes?/gi, "").trim());
        }

        if (likesCount > 0) {
          likesArr.push(likesCount);
        }

        // Go back to profile
        await page.goBack();
        await randomDelay(page, config.delays.pageLoad);
      } catch (err) {
        log.warn(`Error scraping post ${p} for engagement`, { username, error: err.message });
        // Navigate back to profile to recover
        await safeGoto(page, `https://www.instagram.com/${username}/`);
        await randomDelay(page, config.delays.pageLoad);
      }
    }

    if (likesArr.length === 0) {
      log.warn("Could not extract likes from any post", { username });
      return { avgLikes: 0, avgComments: 0 };
    }

    const avgLikes = Math.round(likesArr.reduce((a, b) => a + b, 0) / likesArr.length);
    // Estimate comments as ~3% of likes (industry average)
    const avgComments = Math.round(avgLikes * 0.03);

    log.info(`Engagement scraped: avgLikes=${avgLikes}, avgComments=${avgComments}`, { username });
    return { avgLikes, avgComments };
  } catch (err) {
    log.error("Engagement scraping failed", { username, error: err.message });
    return { avgLikes: 0, avgComments: 0 };
  }
}

// --- Main discovery flow ---

(async () => {
  await connectDB();

  const userId = process.env.AUTOMATION_USER_ID;
  if (!userId) {
    log.error("AUTOMATION_USER_ID not set. Cannot run discovery without user context.");
    process.exit(1);
  }

  config = await getConfigForAutomation();

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

  const hashtags = config.hashtags;
  const minResults = config.minDiscoveryResults || 5;
  let totalSaved = 0;
  let totalSkipped = 0;

  for (const hashtag of hashtags) {
    // Stop scanning more hashtags if target reached
    if (totalSaved >= minResults) break;

    log.info(`Starting discovery for #${hashtag}`);

    // Rate limit check before each hashtag search
    const searchCheck = await checkAndLog(userId, "search_performed", { metadata: { hashtag } });
    if (!searchCheck.allowed) {
      log.warn(`Rate limit reached for searches: ${searchCheck.reason}. Stopping discovery.`);
      break;
    }

    try {
      await safeGoto(page, `https://www.instagram.com/explore/tags/${hashtag}/`);
    } catch (err) {
      log.error(`Failed to open hashtag page #${hashtag}`, { error: err.message });
      continue;
    }

    await dismissAllPopups(page);
    await randomDelay(page, config.delays.pageLoad);

    // Scroll more aggressively to load plenty of posts
    await scrollToLoadPosts(page, 10);

    // Collect post URLs as strings — these survive navigation unlike DOM elements
    const postHrefs = await page.evaluate((selector) => {
      const anchors = document.querySelectorAll(selector);
      const hrefs = [];
      const seen = new Set();
      for (const a of anchors) {
        const href = a.getAttribute("href");
        if (href && !seen.has(href)) {
          seen.add(href);
          hrefs.push(href);
        }
      }
      return hrefs;
    }, SELECTORS.postLinks);

    log.info(`Collected ${postHrefs.length} unique post URLs for #${hashtag}`);

    if (postHrefs.length === 0) {
      log.warn(`0 posts found for #${hashtag}, skipping`);
      continue;
    }

    const maxPosts = Math.min(postHrefs.length, config.maxPostsPerHashtag);
    let noProfilesFound = 0;

    for (let i = 0; i < maxPosts; i++) {
      // Stop if we've reached our target
      if (totalSaved >= minResults) break;

      // Stop if we've gone through many posts without finding ANY valid profiles
      // This prevents getting stuck in an infinite loop when extraction is broken
      if (noProfilesFound > 15) {
        log.warn(`Too many consecutive failures (${noProfilesFound}) for #${hashtag}, moving to next hashtag`);
        break;
      }

      try {
        const postPath = postHrefs[i];
        const postUrl = postPath.startsWith("http")
          ? postPath
          : `https://www.instagram.com${postPath}`;

        log.info(`Opening post ${i + 1}/${maxPosts} for #${hashtag} | Saved so far: ${totalSaved}/${minResults}`);

        // Navigate directly to post URL — no stale DOM issues
        await safeGoto(page, postUrl);
        await randomDelay(page, config.delays.pageLoad);
        await dismissAllPopups(page);

        // Extract username from the post page
        const username = await extractUsernameFromPost(page);

        if (!username) {
          noProfilesFound++;
          log.warn(`Post ${i + 1}/${maxPosts}: Failed to extract username (${noProfilesFound}/15 attempts)`);

          // Stop early if too many consecutive failures
          if (noProfilesFound >= 15) {
            log.error(`❌ Too many extraction failures for #${hashtag}. Detailed logs above.`);
            break;
          }
          continue;
        }

        noProfilesFound = 0; // Reset counter on success
        log.info(`✅ Post ${i + 1}/${maxPosts}: Found creator @${username}`);

        // Skip duplicates
        if (processedUsers.has(username)) {
          log.info(`⏭️  Skipping duplicate: @${username}`);
          continue;
        }

        processedUsers.add(username);

        // Rate limit check before profile visit
        const profileCheck = await checkAndLog(userId, "profile_visited", { influencerUsername: username });
        if (!profileCheck.allowed) {
          log.warn(`Rate limit reached for profile visits: ${profileCheck.reason}. Stopping.`);
          break;
        }

        // Navigate to profile
        await safeGoto(page, `https://www.instagram.com/${username}/`);
        await randomDelay(page, config.delays.pageLoad);
        await dismissAllPopups(page);

        // Extract followers
        const followers = await extractFollowers(page);
        log.info(`Followers: ${followers}`, { username });

        // Extract bio
        const bio = await extractBio(page);
        log.info(`Bio: ${bio.substring(0, 80)}...`, { username });

        // Apply basic filters first (followers range + niche)
        const filterResult = passesFilters(followers, bio, config.filters, hashtag);
        if (!filterResult.pass) {
          log.info(`Filtered out: ${filterResult.reason}`, { username });
          totalSkipped++;
          continue;
        }

        // Scrape engagement data from recent posts
        const { avgLikes, avgComments } = await scrapeEngagement(page, username);

        // Run analytics pipeline
        const analytics = analyzeInfluencer({
          followers,
          avgLikes,
          avgComments,
        });

        log.info(`Analytics: ER=${analytics.engagementRate}%, reach=${analytics.estimatedReach}, fake=${analytics.fakeStatus}, score=${analytics.score}`, { username });

        // Apply analytics filters
        if (config.filters.minEngagement && analytics.engagementRate < config.filters.minEngagement) {
          log.info(`Filtered out: engagement ${analytics.engagementRate}% < min ${config.filters.minEngagement}%`, { username });
          totalSkipped++;
          continue;
        }

        if (config.filters.minReach && analytics.estimatedReach < config.filters.minReach) {
          log.info(`Filtered out: reach ${analytics.estimatedReach} < min ${config.filters.minReach}`, { username });
          totalSkipped++;
          continue;
        }

        if (config.filters.rejectFake && analytics.fakeStatus === "HIGH_FAKE") {
          log.info(`Filtered out: fake status ${analytics.fakeStatus}`, { username });
          totalSkipped++;
          continue;
        }

        // Save to DB via service (now with analytics data)
        const { saved } = await saveInfluencer(userId, {
          username,
          followers,
          followersCount: analytics.followersCount,
          engagementRate: analytics.engagementRate,
          estimatedReach: analytics.estimatedReach,
          fakeStatus: analytics.fakeStatus,
          score: analytics.score,
          avgLikes,
          avgComments,
          bio,
          niche: hashtag,
          sourceHashtag: hashtag,
          instagramUrl: `https://www.instagram.com/${username}/`,
        });

        if (saved) {
          totalSaved++;
          log.success(`Saved ${totalSaved}/${minResults}: @${username} (score: ${analytics.score})`);
        }

      } catch (err) {
        log.error(`Error processing post ${i}`, { error: err.message });
        continue;
      }
    }

    log.success(`Finished #${hashtag} — saved so far: ${totalSaved}, skipped: ${totalSkipped}`);
  }

  // If target not met, retry with relaxed filters (lower minFollowers, skip niche keyword check)
  if (totalSaved < minResults) {
    log.warn(`Only ${totalSaved}/${minResults} found. Retrying with relaxed filters...`);

    const relaxedFilters = {
      ...config.filters,
      minFollowers: Math.max(1000, Math.floor(config.filters.minFollowers / 5)),
      skipNicheCheck: true,
    };

    for (const hashtag of hashtags) {
      if (totalSaved >= minResults) break;

      log.info(`[Relaxed] Retrying #${hashtag}`);

      try {
        await safeGoto(page, `https://www.instagram.com/explore/tags/${hashtag}/`);
      } catch (err) {
        log.error(`[Relaxed] Failed to open #${hashtag}`, { error: err.message });
        continue;
      }

      await dismissAllPopups(page);
      await randomDelay(page, config.delays.pageLoad);
      await scrollToLoadPosts(page, 10);

      const postHrefs2 = await page.evaluate((selector) => {
        const anchors = document.querySelectorAll(selector);
        const hrefs = [];
        const seen = new Set();
        for (const a of anchors) {
          const href = a.getAttribute("href");
          if (href && !seen.has(href)) {
            seen.add(href);
            hrefs.push(href);
          }
        }
        return hrefs;
      }, SELECTORS.postLinks);

      const maxPosts2 = Math.min(postHrefs2.length, config.maxPostsPerHashtag);
      let noProfilesFound2 = 0;

      for (let i = 0; i < maxPosts2; i++) {
        if (totalSaved >= minResults) break;

        if (noProfilesFound2 > 15) {
          log.warn(`[Relaxed] Too many consecutive failures (${noProfilesFound2}) for #${hashtag}, moving on`);
          break;
        }

        try {
          const postPath = postHrefs2[i];
          const postUrl = postPath.startsWith("http")
            ? postPath
            : `https://www.instagram.com${postPath}`;

          log.info(`[Relaxed] Post ${i + 1}/${maxPosts2} for #${hashtag} | Saved: ${totalSaved}/${minResults}`);

          await safeGoto(page, postUrl);
          await randomDelay(page, config.delays.pageLoad);
          await dismissAllPopups(page);

          const username = await extractUsernameFromPost(page);
          if (!username) {
            noProfilesFound2++;
            log.warn(`[Relaxed] Post ${i + 1}/${maxPosts2}: Failed to extract username (${noProfilesFound2}/15 attempts)`);
            continue;
          }

          noProfilesFound2 = 0;
          log.info(`[Relaxed] ✅ Post ${i + 1}/${maxPosts2}: Found creator @${username}`);

          if (processedUsers.has(username)) {
            log.info(`[Relaxed] ⏭️  Skipping duplicate: @${username}`);
            continue;
          }

          processedUsers.add(username);

          await safeGoto(page, `https://www.instagram.com/${username}/`);
          await randomDelay(page, config.delays.pageLoad);
          await dismissAllPopups(page);

          const followers = await extractFollowers(page);
          const bio = await extractBio(page);

          const filterResult = passesFilters(followers, bio, relaxedFilters, hashtag);
          if (!filterResult.pass) {
            totalSkipped++;
            continue;
          }

          const { avgLikes, avgComments } = await scrapeEngagement(page, username);
          const analytics = analyzeInfluencer({ followers, avgLikes, avgComments });

          // Skip analytics filters in relaxed mode — only reject obvious fakes
          if (config.filters.rejectFake && analytics.fakeStatus === "HIGH_FAKE") {
            totalSkipped++;
            continue;
          }

          const { saved } = await saveInfluencer(userId, {
            username,
            followers,
            followersCount: analytics.followersCount,
            engagementRate: analytics.engagementRate,
            estimatedReach: analytics.estimatedReach,
            fakeStatus: analytics.fakeStatus,
            score: analytics.score,
            avgLikes,
            avgComments,
            bio,
            niche: hashtag,
            sourceHashtag: hashtag,
            instagramUrl: `https://www.instagram.com/${username}/`,
          });

          if (saved) {
            totalSaved++;
            log.success(`[Relaxed] Saved ${totalSaved}/${minResults}: @${username} (score: ${analytics.score})`);
          }
        } catch (err) {
          log.error(`[Relaxed] Error processing post ${i}`, { error: err.message });
          continue;
        }
      }
    }
  }

  if (totalSaved >= minResults) {
    log.success(`Target reached! Saved ${totalSaved} influencers.`);
  } else {
    log.warn(`Discovery ended with ${totalSaved}/${minResults} influencers found. Try adding more hashtags or loosening filters.`);
  }

  await browser.close();
  process.exit(0);
})();