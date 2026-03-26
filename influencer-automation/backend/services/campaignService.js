const Campaign = require("../models/Campaign");
const Influencer = require("../models/Influencer");

async function createCampaign(data) {
  const campaign = new Campaign(data);
  await campaign.save();
  return campaign;
}

async function getCampaigns(filter = {}) {
  return Campaign.find(filter).sort({ createdAt: -1 });
}

async function getCampaignById(id) {
  return Campaign.findById(id);
}

async function updateCampaign(id, updates) {
  return Campaign.findByIdAndUpdate(id, updates, { new: true });
}

async function deleteCampaign(id) {
  return Campaign.findByIdAndDelete(id);
}

async function getCampaignStats(id) {
  const pipeline = await Influencer.aggregate([
    { $match: { campaignId: id } },
    {
      $group: {
        _id: null,
        discovered: { $sum: 1 },
        contacted: {
          $sum: { $cond: [{ $in: ["$status", ["CONTACTED", "REPLIED", "DEAL"]] }, 1, 0] },
        },
        replied: {
          $sum: { $cond: [{ $in: ["$status", ["REPLIED", "DEAL"]] }, 1, 0] },
        },
        deals: {
          $sum: { $cond: [{ $eq: ["$status", "DEAL"] }, 1, 0] },
        },
      },
    },
  ]);

  return pipeline[0] || { discovered: 0, contacted: 0, replied: 0, deals: 0 };
}

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getCampaignStats,
};
