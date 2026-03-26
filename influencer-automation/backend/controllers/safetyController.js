const {
  getCurrentUsage,
  getRecentActivity,
  getRateLimits,
  updateRateLimits,
} = require("../services/rateLimitService");

exports.getDashboard = async (req, res) => {
  try {
    const usage = await getCurrentUsage();
    const limits = getRateLimits();

    // Check if any limit is exceeded
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
    const activity = await getRecentActivity(Number(limit), actionType || null);
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateLimits = async (req, res) => {
  try {
    const limits = updateRateLimits(req.body);
    res.json({ message: "Rate limits updated", limits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
