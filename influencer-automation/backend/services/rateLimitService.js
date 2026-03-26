const ActivityLog = require("../models/ActivityLog");
const config = require("../config");
const log = require("../utils/logger");

async function logAction(actionType, metadata = {}) {
  try {
    await ActivityLog.create({ actionType, ...metadata });
  } catch (err) {
    log.error("Failed to log action", { actionType, error: err.message });
  }
}

async function getActionCount(actionType, windowMs) {
  const since = new Date(Date.now() - windowMs);
  return ActivityLog.countDocuments({
    actionType,
    timestamp: { $gte: since },
  });
}

async function canPerformAction(actionType) {
  const limits = config.rateLimits && config.rateLimits[actionType];
  if (!limits) {
    return { allowed: true, reason: "No limits configured" };
  }

  const currentHourly = await getActionCount(actionType, 60 * 60 * 1000);
  const currentDaily = await getActionCount(actionType, 24 * 60 * 60 * 1000);

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

async function checkAndLog(actionType, metadata = {}) {
  const result = await canPerformAction(actionType);
  if (result.allowed) {
    await logAction(actionType, metadata);
  }
  return result;
}

async function getCurrentUsage() {
  const actionTypes = ["dm_sent", "profile_visited", "search_performed", "reply_checked", "discovery_run"];
  const usage = {};

  for (const actionType of actionTypes) {
    const limits = (config.rateLimits && config.rateLimits[actionType]) || {};
    const currentHourly = await getActionCount(actionType, 60 * 60 * 1000);
    const currentDaily = await getActionCount(actionType, 24 * 60 * 60 * 1000);

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

async function getRecentActivity(limit = 50, actionType = null) {
  const filter = actionType ? { actionType } : {};
  return ActivityLog.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
}

function getRateLimits() {
  return config.rateLimits || {};
}

function updateRateLimits(updates) {
  if (!config.rateLimits) config.rateLimits = {};
  Object.assign(config.rateLimits, updates);
  config.saveConfig({ rateLimits: config.rateLimits });
  return config.rateLimits;
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
