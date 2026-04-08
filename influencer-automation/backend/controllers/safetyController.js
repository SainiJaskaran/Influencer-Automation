const {
  getCurrentUsage,
  getRecentActivity,
  getRateLimits,
  updateRateLimits,
} = require("../services/rateLimitService");

exports.getDashboard = async (req, res) => {
  try {
    const usage = await getCurrentUsage(req.userId);
    const limits = await getRateLimits(req.userId);

    let anyExceeded = false;
    for (const [, data] of Object.entries(usage)) {
      if (data.hourlyPercent >= 100 || data.dailyPercent >= 100) {
        anyExceeded = true;
        break;
      }
    }

    res.json({ usage, limits, paused: anyExceeded });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const { actionType, limit = 50 } = req.query;
    const activity = await getRecentActivity(req.userId, Number(limit), actionType || null);
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateLimits = async (req, res) => {
  try {
    const validTypes = ["dm_sent", "profile_visited", "search_performed", "reply_checked", "discovery_run"];
    const sanitized = {};
    for (const [key, val] of Object.entries(req.body)) {
      if (!validTypes.includes(key)) continue;
      if (!val || typeof val !== "object") continue;
      sanitized[key] = {
        perHour: Math.max(0, Math.min(10000, Number(val.perHour) || 0)),
        perDay: Math.max(0, Math.min(100000, Number(val.perDay) || 0)),
      };
    }
    const limits = await updateRateLimits(req.userId, sanitized);
    res.json({ message: "Rate limits updated", limits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
