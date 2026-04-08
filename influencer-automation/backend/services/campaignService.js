const Campaign = require("../models/Campaign");
const Influencer = require("../models/Influencer");
const mongoose = require("mongoose");

async function createCampaign(userId, data) {
  const campaign = new Campaign({ ...data, userId });
  await campaign.save();
  return campaign;
}

async function getCampaigns(userId, filter = {}) {
  return Campaign.find({ ...filter, userId }).sort({ createdAt: -1 });
}

async function getCampaignById(userId, id) {
  return Campaign.findOne({ _id: id, userId });
}

async function updateCampaign(userId, id, updates) {
  return Campaign.findOneAndUpdate({ _id: id, userId }, updates, { new: true });
}

async function deleteCampaign(userId, id) {
  return Campaign.findOneAndDelete({ _id: id, userId });
}

async function getCampaignStats(userId, id) {
  const campaignId = typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
  const pipeline = await Influencer.aggregate([
    { $match: { campaignId, userId: typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId } },
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
