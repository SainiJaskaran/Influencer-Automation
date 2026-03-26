const cron = require("node-cron");
const Campaign = require("../models/Campaign");
const { startProcess } = require("./processManager");
const log = require("../utils/logger");

// Map of campaignId -> cron job
const activeJobs = new Map();

const STEP_SCRIPTS = {
  discovery: "discoverInfluencers.js",
  "send-dm": "sendDM.js",
  "check-replies": "checkReplies.js",
};

function startCampaignSchedule(campaign) {
  const id = campaign._id.toString();

  if (activeJobs.has(id)) {
    log.warn(`Campaign ${campaign.name} already scheduled, stopping old job first`);
    stopCampaignSchedule(id);
  }

  if (!campaign.schedule || !cron.validate(campaign.schedule)) {
    log.error(`Invalid cron expression for campaign ${campaign.name}: ${campaign.schedule}`);
    return false;
  }

  const job = cron.schedule(campaign.schedule, async () => {
    log.info(`[Scheduler] Running campaign: ${campaign.name}`);

    try {
      const steps = campaign.automationSteps || ["discovery", "send-dm", "check-replies"];

      for (const step of steps) {
        const script = STEP_SCRIPTS[step];
        if (!script) continue;

        const processName = `campaign-${campaign.name}-${step}`;
        const result = startProcess(processName, script);
        log.info(`[Scheduler] ${step}: ${result.message}`);
      }

      await Campaign.findByIdAndUpdate(id, { lastRunAt: new Date() });
    } catch (err) {
      log.error(`[Scheduler] Error running campaign ${campaign.name}`, { error: err.message });
    }
  });

  activeJobs.set(id, job);
  log.success(`[Scheduler] Campaign "${campaign.name}" scheduled: ${campaign.schedule}`);
  return true;
}

function stopCampaignSchedule(campaignId) {
  const id = campaignId.toString();
  const job = activeJobs.get(id);
  if (job) {
    job.stop();
    activeJobs.delete(id);
    log.info(`[Scheduler] Stopped schedule for campaign ${id}`);
    return true;
  }
  return false;
}

async function initializeSchedules() {
  try {
    const activeCampaigns = await Campaign.find({ status: "active" });
    log.info(`[Scheduler] Initializing ${activeCampaigns.length} active campaign(s)`);

    for (const campaign of activeCampaigns) {
      startCampaignSchedule(campaign);
    }
  } catch (err) {
    log.error("[Scheduler] Failed to initialize schedules", { error: err.message });
  }
}

function getActiveSchedules() {
  return Array.from(activeJobs.keys());
}

module.exports = {
  startCampaignSchedule,
  stopCampaignSchedule,
  initializeSchedules,
  getActiveSchedules,
};
