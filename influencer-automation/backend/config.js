const path = require("path");
const fs = require("fs");
const paths = require("./utils/paths");

// Load .env from the correct location (DATA_DIR or backend dir)
require("dotenv").config({ path: paths.envPath() });

const SETTINGS_PATH = paths.settingsPath();

// Built-in cloud database — works for every installation
const CLOUD_MONGO_URI = "mongodb+srv://jia2haseeb_db_user:qwerty%40123@influencer.md1wsub.mongodb.net/influencerBot?retryWrites=true&w=majority&appName=influencer";
const CLOUD_JWT_SECRET = "influencer-hub-prod-j2h-2024-secure";

// Default values
const defaults = {
  // Server
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || CLOUD_MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || CLOUD_JWT_SECRET,
  sessionPath: paths.legacySessionPath(),

  // Discovery
  hashtags: ["skincare", "beauty", "makeup", "fashion"],
  maxPostsPerHashtag: 50,
  minDiscoveryResults: 5,

  // Filtering
  filters: {
    minFollowers: 10000,
    maxFollowers: 200000,
    minEngagement: 2,
    minReach: 3000,
    rejectFake: true,
    nicheKeywords: ["beauty", "skincare", "makeup", "fashion", "cosmetics", "skin", "glow", "haircare"],
  },

  // Messaging
  dmBatchSize: 5,
  messageTemplates: [
    `Hi {name},\n\nI came across your {niche} content and really liked your posts.\n\nWould you be open to discussing a potential collaboration?`,
  ],

  // Delays (milliseconds) — human-like timing
  delays: {
    betweenDMs: { min: 30000, max: 60000 },
    pageLoad: { min: 3000, max: 5000 },
    afterScroll: { min: 3000, max: 5000 },
    typing: { min: 30, max: 80 },
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
 * Load saved overrides from settings-override.json (in DATA_DIR).
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
 * Save settings overrides to DATA_DIR so spawned child processes read them.
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

/**
 * Load config for automation child processes.
 * Reads AUTOMATION_USER_ID env var and loads per-user settings from DB.
 */
async function getConfigForAutomation() {
  const userId = process.env.AUTOMATION_USER_ID;
  const cfg = loadConfig();

  if (!userId) {
    return cfg;
  }

  try {
    const UserSettings = require("./models/UserSettings");
    const settings = await UserSettings.findOne({ userId });

    if (settings) {
      if (settings.hashtags && settings.hashtags.length) cfg.hashtags = settings.hashtags;
      if (settings.maxPostsPerHashtag) cfg.maxPostsPerHashtag = settings.maxPostsPerHashtag;
      if (settings.dmBatchSize) cfg.dmBatchSize = settings.dmBatchSize;
      if (settings.messageTemplates && settings.messageTemplates.length) {
        cfg.messageTemplates = settings.messageTemplates;
      }
      if (settings.filters) {
        const f = settings.filters.toObject ? settings.filters.toObject() : settings.filters;
        Object.assign(cfg.filters, f);
      }
      if (settings.rateLimits) {
        const r = settings.rateLimits.toObject ? settings.rateLimits.toObject() : settings.rateLimits;
        for (const key of Object.keys(r)) {
          if (r[key] && (r[key].perHour || r[key].perDay)) {
            cfg.rateLimits[key] = { ...cfg.rateLimits[key], ...r[key] };
          }
        }
      }
    }
  } catch (err) {
    const log = require("./utils/logger");
    log.warn("Failed to load user settings, using defaults", { userId, error: err.message });
  }

  // Per-user session path — in writable DATA_DIR
  cfg.sessionPath = paths.userSessionPath(userId);
  cfg.userId = userId;

  return cfg;
}

const config = loadConfig();
config.saveConfig = saveConfig;
config.loadConfig = loadConfig;
config.getConfigForAutomation = getConfigForAutomation;
config.SETTINGS_PATH = SETTINGS_PATH;

module.exports = config;
