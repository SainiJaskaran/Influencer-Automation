const Influencer = require("../models/Influencer");
const log = require("../utils/logger");

/**
 * Save a new influencer to DB. Skip if already exists for this user.
 * Returns { saved: boolean, influencer }
 */
async function saveInfluencer(userId, data) {
  const existing = await Influencer.findOne({ username: data.username, userId });
  if (existing) {
    log.info("Influencer already exists, skipping", { username: data.username });
    return { saved: false, influencer: existing };
  }

  const influencer = new Influencer({ ...data, userId });
  await influencer.save();
  log.success("Influencer saved", { username: data.username, followers: data.followers });
  return { saved: true, influencer };
}

/**
 * Get influencers ready for outreach (status = NEW) for a specific user.
 */
async function getNewInfluencers(userId, limit) {
  return Influencer.find({ status: "NEW", userId }).limit(limit);
}

/**
 * Get influencers who were contacted but haven't replied for a specific user.
 */
async function getContactedInfluencers(userId) {
  return Influencer.find({ status: "CONTACTED", replied: false, userId });
}

/**
 * Mark influencer as contacted (scoped by user).
 */
async function markContacted(userId, username, messageSent) {
  return Influencer.findOneAndUpdate(
    { username, userId },
    {
      status: "CONTACTED",
      contactedAt: new Date(),
      lastMessageSent: messageSent,
    },
    { new: true }
  );
}

/**
 * Mark influencer as replied (scoped by user).
 */
async function markReplied(userId, username) {
  return Influencer.findOneAndUpdate(
    { username, userId },
    {
      status: "REPLIED",
      replied: true,
      repliedAt: new Date(),
    },
    { new: true }
  );
}

module.exports = {
  saveInfluencer,
  getNewInfluencers,
  getContactedInfluencers,
  markContacted,
  markReplied,
};
