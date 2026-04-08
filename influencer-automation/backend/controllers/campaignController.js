const {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getCampaignStats,
} = require("../services/campaignService");
const {
  startCampaignSchedule,
  stopCampaignSchedule,
} = require("../services/schedulerService");
const { startProcess } = require("../services/processManager");
const log = require("../utils/logger");

exports.create = async (req, res) => {
  try {
    const campaign = await createCampaign(req.userId, req.body);
    log.success("Campaign created", { name: campaign.name });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const campaigns = await getCampaigns(req.userId, filter);

    const results = [];
    for (const c of campaigns) {
      const stats = await getCampaignStats(req.userId, c._id);
      results.push({ ...c.toObject(), liveStats: stats });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const campaign = await getCampaignById(req.userId, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const stats = await getCampaignStats(req.userId, campaign._id);
    res.json({ ...campaign.toObject(), liveStats: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const allowedFields = ["name", "hashtags", "filters", "messageTemplates", "schedule", "automationSteps", "status"];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    const campaign = await updateCampaign(req.userId, req.params.id, updateData);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    log.info("Campaign updated", { name: campaign.name });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const campaign = await getCampaignById(req.userId, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    if (campaign.status === "active") {
      stopCampaignSchedule(campaign._id);
    }

    await deleteCampaign(req.userId, req.params.id);
    log.info("Campaign deleted", { name: campaign.name });
    res.json({ message: "Campaign deleted", name: campaign.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.start = async (req, res) => {
  try {
    const campaign = await getCampaignById(req.userId, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    if (!campaign.schedule) {
      return res.status(400).json({ error: "Campaign has no schedule set" });
    }

    const scheduled = startCampaignSchedule(campaign, req.userId);
    if (!scheduled) {
      return res.status(400).json({ error: "Invalid cron expression" });
    }

    campaign.status = "active";
    await campaign.save();

    log.success("Campaign activated", { name: campaign.name, schedule: campaign.schedule });
    res.json({ message: `Campaign "${campaign.name}" activated`, schedule: campaign.schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.pause = async (req, res) => {
  try {
    const campaign = await getCampaignById(req.userId, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    stopCampaignSchedule(campaign._id);
    campaign.status = "paused";
    await campaign.save();

    log.info("Campaign paused", { name: campaign.name });
    res.json({ message: `Campaign "${campaign.name}" paused` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.runNow = async (req, res) => {
  try {
    const campaign = await getCampaignById(req.userId, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const steps = campaign.automationSteps || ["discovery", "send-dm", "check-replies"];
    const STEP_SCRIPTS = {
      discovery: "discoverInfluencers.js",
      "send-dm": "sendDM.js",
      "check-replies": "checkReplies.js",
    };

    const results = [];
    for (const step of steps) {
      const script = STEP_SCRIPTS[step];
      if (!script) continue;
      const processName = `${req.userId}-campaign-${campaign.name}-${step}`;
      const result = startProcess(processName, script, req.userId);
      results.push({ step, ...result });
    }

    campaign.lastRunAt = new Date();
    await campaign.save();

    log.success("Campaign run triggered", { name: campaign.name, steps });
    res.json({ message: `Campaign "${campaign.name}" running now`, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
