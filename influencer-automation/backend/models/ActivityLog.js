const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

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
  },
});

ActivityLogSchema.index({ userId: 1, actionType: 1, timestamp: -1 });

// Auto-purge logs older than 30 days
ActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
