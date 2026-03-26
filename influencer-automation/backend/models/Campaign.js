const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },

  hashtags: [String],

  filters: {
    minFollowers: { type: Number, default: 10000 },
    maxFollowers: { type: Number, default: 200000 },
    minEngagement: { type: Number, default: 2 },
    minReach: { type: Number, default: 3000 },
    rejectFake: { type: Boolean, default: true },
    nicheKeywords: [String],
  },

  messageTemplates: [String],

  schedule: {
    type: String,
    default: null, // cron expression e.g. "0 9 * * *"
  },

  automationSteps: {
    type: [String],
    enum: ["discovery", "send-dm", "check-replies"],
    default: ["discovery", "send-dm", "check-replies"],
  },

  status: {
    type: String,
    enum: ["active", "paused", "completed"],
    default: "paused",
  },

  stats: {
    discovered: { type: Number, default: 0 },
    contacted: { type: Number, default: 0 },
    replied: { type: Number, default: 0 },
    deals: { type: Number, default: 0 },
  },

  lastRunAt: Date,

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

CampaignSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Campaign", CampaignSchema);
