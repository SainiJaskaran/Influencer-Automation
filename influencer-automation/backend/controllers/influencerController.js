const { spawn } = require("child_process");
const path = require("path");
const Influencer = require("../models/Influencer");
const config = require("../config");
const log = require("../utils/logger");

// Track running automation processes
const runningProcesses = {};

exports.createInfluencer = async (req, res) => {
  try {
    const influencer = new Influencer(req.body);
    await influencer.save();
    res.json(influencer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInfluencers = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const influencers = await Influencer.find(filter).sort({ createdAt: -1 });
    res.json(influencers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const total = await Influencer.countDocuments();
    const contacted = await Influencer.countDocuments({ status: "CONTACTED" });
    const replied = await Influencer.countDocuments({ status: "REPLIED" });
    const newCount = await Influencer.countDocuments({ status: "NEW" });
    const deals = await Influencer.countDocuments({ status: "DEAL" });
    const conversionRate = contacted > 0
      ? parseFloat(((replied / contacted) * 100).toFixed(1))
      : 0;

    // Averages
    const avgPipeline = await Influencer.aggregate([
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
      running: Object.keys(runningProcesses),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Start an automation process (discovery, send-dm, check-replies).
 */
function startProcess(name, scriptFile) {
  if (runningProcesses[name]) {
    return { started: false, message: `${name} is already running` };
  }

  const scriptPath = path.join(__dirname, "..", "automation", scriptFile);
  const child = spawn("node", [scriptPath], {
    stdio: "pipe",
    cwd: path.join(__dirname, ".."),
  });

  runningProcesses[name] = child;

  child.stdout.on("data", (data) => {
    log.info(`[${name}] ${data.toString().trim()}`);
  });

  child.stderr.on("data", (data) => {
    log.error(`[${name}] ${data.toString().trim()}`);
  });

  child.on("close", (code) => {
    log.info(`[${name}] Process exited with code ${code}`);
    delete runningProcesses[name];
  });

  child.on("error", (err) => {
    log.error(`[${name}] Process error`, { error: err.message });
    delete runningProcesses[name];
  });

  return { started: true, message: `${name} started` };
}

exports.startDiscovery = (req, res) => {
  const result = startProcess("discovery", "discoverInfluencers.js");
  res.json(result);
};

exports.startDM = (req, res) => {
  const result = startProcess("send-dm", "sendDM.js");
  res.json(result);
};

exports.startReplyCheck = (req, res) => {
  const result = startProcess("check-replies", "checkReplies.js");
  res.json(result);
};

exports.stopProcess = (req, res) => {
  const { name } = req.params;

  if (!name || name === "all") {
    // Stop all
    const stopped = [];
    for (const [procName, child] of Object.entries(runningProcesses)) {
      child.kill("SIGTERM");
      delete runningProcesses[procName];
      stopped.push(procName);
    }
    return res.json({ stopped, message: `Stopped ${stopped.length} process(es)` });
  }

  const child = runningProcesses[name];
  if (!child) {
    return res.json({ stopped: false, message: `${name} is not running` });
  }

  child.kill("SIGTERM");
  delete runningProcesses[name];
  res.json({ stopped: true, message: `${name} stopped` });
};

exports.getSettings = (req, res) => {
  res.json({
    hashtags: config.hashtags,
    filters: config.filters,
    dmBatchSize: config.dmBatchSize,
    delays: config.delays,
    maxPostsPerHashtag: config.maxPostsPerHashtag,
  });
};

exports.updateSettings = (req, res) => {
  const updates = req.body;

  // Update in-memory config
  if (updates.hashtags) config.hashtags = updates.hashtags;
  if (updates.filters) Object.assign(config.filters, updates.filters);
  if (updates.dmBatchSize) config.dmBatchSize = updates.dmBatchSize;
  if (updates.maxPostsPerHashtag) config.maxPostsPerHashtag = updates.maxPostsPerHashtag;

  // Persist to disk so spawned child processes pick up changes
  config.saveConfig(updates);

  log.info("Settings updated and saved to disk", updates);
  res.json({
    message: "Settings updated",
    settings: {
      hashtags: config.hashtags,
      filters: config.filters,
      dmBatchSize: config.dmBatchSize,
      delays: config.delays,
      maxPostsPerHashtag: config.maxPostsPerHashtag,
    },
  });
};

exports.deleteInfluencer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Influencer.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: "Influencer not found" });
    }
    log.info("Influencer deleted", { username: result.username });
    res.json({ message: "Deleted", username: result.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
