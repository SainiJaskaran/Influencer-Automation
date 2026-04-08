const ActivityLog = require("../models/ActivityLog");
const config = require("../config");
const log = require("../utils/logger");

async function getUserRateLimits(userId) {
  try {
    const UserSettings = require("../models/UserSettings");
    const settings = await UserSettings.findOne({ userId });
    if (settings && settings.rateLimits) {
      const merged = { ...config.rateLimits };
      for (const key of Object.keys(settings.rateLimits.toObject ? settings.rateLimits.toObject() : settings.rateLimits)) {
        if (settings.rateLimits[key] && (settings.rateLimits[key].perHour || settings.rateLimits[key].perDay)) {
          merged[key] = { ...merged[key], ...settings.rateLimits[key].toObject ? settings.rateLimits[key].toObject() : settings.rateLimits[key] };
        }
      }
      return merged;
    }
  } catch (_) {}
  return config.rateLimits || {};
}

async function logAction(userId, actionType, metadata = {}) {
  try {
    await ActivityLog.create({ userId, actionType, ...metadata });
  } catch (err) {
    log.error("Failed to log action", { actionType, error: err.message });
  }
}

async function getActionCount(userId, actionType, windowMs) {
  const since = new Date(Date.now() - windowMs);
  return ActivityLog.countDocuments({
    userId,
    actionType,
    timestamp: { $gte: since },
  });
}

async function canPerformAction(userId, actionType) {
  const allLimits = await getUserRateLimits(userId);
  const limits = allLimits[actionType];
  if (!limits) {
    return { allowed: true, reason: "No limits configured" };
  }

  const currentHourly = await getActionCount(userId, actionType, 60 * 60 * 1000);
  const currentDaily = await getActionCount(userId, actionType, 24 * 60 * 60 * 1000);

  if (limits.perHour && currentHourly >= limits.perHour) {
    return {
      allowed: false,
      reason: `Hourly limit reached (${currentHourly}/${limits.perHour})`,
      currentHourly,
      limitHourly: limits.perHour,
      currentDaily,
      limitDaily: limits.perDay,
    };
  }

  if (limits.perDay && currentDaily >= limits.perDay) {
    return {
      allowed: false,
      reason: `Daily limit reached (${currentDaily}/${limits.perDay})`,
      currentHourly,
      limitHourly: limits.perHour,
      currentDaily,
      limitDaily: limits.perDay,
    };
  }

  return {
    allowed: true,
    reason: "Within limits",
    currentHourly,
    limitHourly: limits.perHour,
    currentDaily,
    limitDaily: limits.perDay,
  };
}

async function checkAndLog(userId, actionType, metadata = {}) {
  const result = await canPerformAction(userId, actionType);
  if (result.allowed) {
    await logAction(userId, actionType, metadata);
  }
  return result;
}

async function getCurrentUsage(userId) {
  const actionTypes = ["dm_sent", "profile_visited", "search_performed", "reply_checked", "discovery_run"];
  const allLimits = await getUserRateLimits(userId);
  const usage = {};

  for (const actionType of actionTypes) {
    const limits = allLimits[actionType] || {};
    const currentHourly = await getActionCount(userId, actionType, 60 * 60 * 1000);
    const currentDaily = await getActionCount(userId, actionType, 24 * 60 * 60 * 1000);

    usage[actionType] = {
      currentHourly,
      limitHourly: limits.perHour || 0,
      currentDaily,
      limitDaily: limits.perDay || 0,
      hourlyPercent: limits.perHour ? Math.round((currentHourly / limits.perHour) * 100) : 0,
      dailyPercent: limits.perDay ? Math.round((currentDaily / limits.perDay) * 100) : 0,
    };
  }

  return usage;
}

async function getRecentActivity(userId, limit = 50, actionType = null) {
  const filter = { userId };
  if (actionType) filter.actionType = actionType;
  return ActivityLog.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
}

async function getRateLimits(userId) {
  return getUserRateLimits(userId);
}

async function updateRateLimits(userId, updates) {
  // Ensure full UserSettings document exists first
  const { getUserSettings } = require("./userSettingsService");
  await getUserSettings(userId);

  const UserSettings = require("../models/UserSettings");
  await UserSettings.findOneAndUpdate(
    { userId },
    { $set: { rateLimits: updates, updatedAt: new Date() } },
    { new: true }
  );
  return updates;
}

module.exports = {
  logAction,
  getActionCount,
  canPerformAction,
  checkAndLog,
  getCurrentUsage,
  getRecentActivity,
  getRateLimits,
  updateRateLimits,
};
