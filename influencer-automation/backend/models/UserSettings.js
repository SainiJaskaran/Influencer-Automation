const mongoose = require("mongoose");

const UserSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  hashtags: [String],

  maxPostsPerHashtag: Number,

  dmBatchSize: Number,

  filters: {
    minFollowers: Number,
    maxFollowers: Number,
    minEngagement: Number,
    minReach: Number,
    rejectFake: Boolean,
    nicheKeywords: [String],
  },

  rateLimits: {
    dm_sent: { perHour: Number, perDay: Number },
    profile_visited: { perHour: Number, perDay: Number },
    search_performed: { perHour: Number, perDay: Number },
    reply_checked: { perHour: Number, perDay: Number },
    discovery_run: { perHour: Number, perDay: Number },
  },

  messageTemplates: [String],

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

UserSettingsSchema.pre("save", function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model("UserSettings", UserSettingsSchema);
