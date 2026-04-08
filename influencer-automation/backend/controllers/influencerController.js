const Influencer = require("../models/Influencer");
const log = require("../utils/logger");
const { startProcess, stopProcess: stopProc, getRunning, stopAllForUser, getRunningForUser } = require("../services/processManager");
const { getUserSettings, updateUserSettings } = require("../services/userSettingsService");
const { ensureUserSession, getSessionStatus } = require("../services/sessionService");
const {
  startLoginBrowser,
  getLoginStatus,
  cancelLogin,
  disconnectInstagram,
} = require("../services/instagramConnectService");

exports.createInfluencer = async (req, res) => {
  try {
    const influencer = new Influencer({ ...req.body, userId: req.userId });
    await influencer.save();
    res.json(influencer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInfluencers = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.userId };
    if (status) filter.status = status;
    const influencers = await Influencer.find(filter).sort({ createdAt: -1 });
    res.json(influencers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const uid = { userId: req.userId };
    const total = await Influencer.countDocuments(uid);
    const contacted = await Influencer.countDocuments({ ...uid, status: "CONTACTED" });
    const replied = await Influencer.countDocuments({ ...uid, status: "REPLIED" });
    const newCount = await Influencer.countDocuments({ ...uid, status: "NEW" });
    const deals = await Influencer.countDocuments({ ...uid, status: "DEAL" });
    const conversionRate = contacted > 0
      ? parseFloat(((replied / contacted) * 100).toFixed(1))
      : 0;

    const mongoose = require("mongoose");
    const userObjId = new mongoose.Types.ObjectId(req.userId);

    const avgPipeline = await Influencer.aggregate([
      { $match: { userId: userObjId } },
      {
        $group: {
          _id: null,
          avgEngagement: { $avg: "$engagementRate" },
          avgScore: { $avg: "$score" },
          avgReach: { $avg: "$estimatedReach" },
        },
      },
    ]);

    const avgs = avgPipeline[0] || { avgEngagement: 0, avgScore: 0, avgReach: 0 };

    res.json({
      total,
      new: newCount,
      contacted,
      replied,
      deals,
      conversionRate,
      avgEngagement: parseFloat((avgs.avgEngagement || 0).toFixed(2)),
      avgScore: Math.round(avgs.avgScore || 0),
      avgReach: Math.round(avgs.avgReach || 0),
      running: getRunningForUser(req.userId),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.startDiscovery = (req, res) => {
  try {
    const session = ensureUserSession(req.userId);
    if (!session.exists) {
      return res.status(400).json({ error: session.error });
    }
    const result = startProcess(`${req.userId}-discovery`, "discoverInfluencers.js", req.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.startDM = (req, res) => {
  try {
    const session = ensureUserSession(req.userId);
    if (!session.exists) {
      return res.status(400).json({ error: session.error });
    }
    const result = startProcess(`${req.userId}-send-dm`, "sendDM.js", req.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.startReplyCheck = (req, res) => {
  try {
    const session = ensureUserSession(req.userId);
    if (!session.exists) {
      return res.status(400).json({ error: session.error });
    }
    const result = startProcess(`${req.userId}-check-replies`, "checkReplies.js", req.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.stopProcess = (req, res) => {
  try {
    const { name } = req.params;

    if (!name || name === "all") {
      const stopped = stopAllForUser(req.userId);
      return res.json({ stopped, message: `Stopped ${stopped.length} process(es)` });
    }

    const fullName = `${req.userId}-${name}`;
    const result = stopProc(fullName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await getUserSettings(req.userId);
    res.json({
      hashtags: settings.hashtags,
      filters: settings.filters,
      dmBatchSize: settings.dmBatchSize,
      maxPostsPerHashtag: settings.maxPostsPerHashtag,
      messageTemplates: settings.messageTemplates,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await updateUserSettings(req.userId, req.body);
    log.info("Settings updated for user", { userId: req.userId });
    res.json({
      message: "Settings updated",
      settings: {
        hashtags: settings.hashtags,
        filters: settings.filters,
        dmBatchSize: settings.dmBatchSize,
        maxPostsPerHashtag: settings.maxPostsPerHashtag,
        messageTemplates: settings.messageTemplates,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sessionStatus = (req, res) => {
  try {
    const status = getSessionStatus(req.userId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.connectInstagram = (req, res) => {
  try {
    const result = startLoginBrowser(req.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.connectStatus = (req, res) => {
  try {
    const login = getLoginStatus(req.userId);
    const session = getSessionStatus(req.userId);
    res.json({ login, session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelConnect = (req, res) => {
  try {
    const result = cancelLogin(req.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.disconnectInstagram = (req, res) => {
  try {
    const result = disconnectInstagram(req.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteInfluencer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Influencer.findOneAndDelete({ _id: id, userId: req.userId });
    if (!result) {
      return res.status(404).json({ error: "Influencer not found" });
    }
    log.info("Influencer deleted", { username: result.username });
    res.json({ message: "Deleted", username: result.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
