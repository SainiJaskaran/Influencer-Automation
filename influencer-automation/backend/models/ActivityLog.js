const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ["dm_sent", "profile_visited", "search_performed", "reply_checked", "discovery_run"],
    required: true,
  },

  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    default: null,
  },

  influencerUsername: {
    type: String,
    default: null,
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Auto-purge logs older than 30 days
ActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
