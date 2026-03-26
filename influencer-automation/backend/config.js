require("dotenv").config();
const path = require("path");
const fs = require("fs");

const SETTINGS_PATH = path.resolve(__dirname, "settings-override.json");

// Default values
const defaults = {
  // Server
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/influencerBot",
  sessionPath: path.resolve(__dirname, process.env.SESSION_PATH || "session.json"),

  // Discovery
  hashtags: ["skincare", "beauty", "makeup", "fashion"],
  maxPostsPerHashtag: 50,
  minDiscoveryResults: 5,

  // Filtering
  filters: {
    minFollowers: 10000,
    maxFollowers: 200000,
    minEngagement: 2,          // minimum engagement rate %
    minReach: 3000,            // minimum estimated reach
    rejectFake: true,          // reject HIGH_FAKE influencers
    nicheKeywords: ["beauty", "skincare", "makeup", "fashion", "cosmetics", "skin", "glow", "haircare"],
  },

  // Messaging
  dmBatchSize: 5,
  messageTemplates: [
    `Hi {name},\n\nI came across your {niche} content and really liked your posts.\n\nWould you be open to discussing a potential collaboration?`,
  ],

  // Delays (milliseconds) — human-like timing
  delays: {
    betweenDMs: { min: 30000, max: 60000 },           // 30s–1 min
    pageLoad: { min: 3000, max: 5000 },
    afterScroll: { min: 3000, max: 5000 },
    typing: { min: 30, max: 80 },                    // per character
  },

  // Rate limits (safety)
  rateLimits: {
    dm_sent: { perHour: 20, perDay: 100 },
    profile_visited: { perHour: 60, perDay: 500 },
    search_performed: { perHour: 30, perDay: 200 },
    reply_checked: { perHour: 40, perDay: 300 },
    discovery_run: { perHour: 5, perDay: 20 },
  },

  // Navigation
  navigation: {
    maxRetries: 3,
    timeout: 60000,
    backoffBase: 3000,
  },
};

/**
 * Load saved overrides from settings-override.json.
 * Merges on top of defaults so child processes always get latest settings.
 */
function loadConfig() {
  const config = JSON.parse(JSON.stringify(defaults));

  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const overrides = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
      if (overrides.hashtags) config.hashtags = overrides.hashtags;
      if (overrides.maxPostsPerHashtag) config.maxPostsPerHashtag = overrides.maxPostsPerHashtag;
      if (overrides.dmBatchSize) config.dmBatchSize = overrides.dmBatchSize;
      if (overrides.filters) Object.assign(config.filters, overrides.filters);
      if (overrides.rateLimits) config.rateLimits = { ...config.rateLimits, ...overrides.rateLimits };
    }
  } catch (_) {
    // If file is corrupt or missing, use defaults
  }

  return config;
}

/**
 * Save settings overrides to disk so spawned child processes read them.
 */
function saveConfig(updates) {
  let existing = {};
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      existing = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
    }
  } catch (_) {}

  if (updates.hashtags) existing.hashtags = updates.hashtags;
  if (updates.maxPostsPerHashtag) existing.maxPostsPerHashtag = updates.maxPostsPerHashtag;
  if (updates.dmBatchSize) existing.dmBatchSize = updates.dmBatchSize;
  if (updates.filters) {
    existing.filters = { ...(existing.filters || {}), ...updates.filters };
  }
  if (updates.rateLimits) {
    existing.rateLimits = { ...(existing.rateLimits || {}), ...updates.rateLimits };
  }

  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(existing, null, 2));
}

const config = loadConfig();
config.saveConfig = saveConfig;
config.loadConfig = loadConfig;
config.SETTINGS_PATH = SETTINGS_PATH;

module.exports = config;
