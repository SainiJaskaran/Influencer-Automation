const mongoose = require("mongoose");

const InfluencerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },

  name: String,

  followers: Number,

  followersCount: {
    type: Number,
    default: 0,
  },

  engagementRate: {
    type: Number,
    default: 0,
  },

  estimatedReach: {
    type: Number,
    default: 0,
  },

  fakeStatus: {
    type: String,
    enum: ["HIGH_FAKE", "LOW_QUALITY", "GOOD", "EXCELLENT", null],
    default: null,
  },

  score: {
    type: Number,
    default: 0,
  },

  avgLikes: {
    type: Number,
    default: 0,
  },

  avgComments: {
    type: Number,
    default: 0,
  },

  bio: String,

  niche: String,

  country: String,

  sourceHashtag: String,

  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    default: null,
  },

  instagramUrl: String,

  status: {
    type: String,
    enum: ["NEW", "CONTACTED", "REPLIED", "DEAL"],
    default: "NEW",
  },

  contactedAt: Date,

  repliedAt: Date,

  replied: {
    type: Boolean,
    default: false,
  },

  lastMessageSent: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Influencer", InfluencerSchema);