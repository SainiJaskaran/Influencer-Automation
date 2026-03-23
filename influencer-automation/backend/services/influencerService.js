const Influencer = require("../models/Influencer");
const log = require("../utils/logger");

/**
 * Save a new influencer to DB. Skip if already exists.
 * Returns { saved: boolean, influencer }
 */
async function saveInfluencer(data) {
  const existing = await Influencer.findOne({ username: data.username });
  if (existing) {
    log.info("Influencer already exists, skipping", { username: data.username });
    return { saved: false, influencer: existing };
  }

  const influencer = new Influencer(data);
  await influencer.save();
  log.success("Influencer saved", { username: data.username, followers: data.followers });
  return { saved: true, influencer };
}

/**
 * Get influencers ready for outreach (status = NEW).
 */
async function getNewInfluencers(limit) {
  return Influencer.find({ status: "NEW" }).limit(limit);
}

/**
 * Get influencers who were contacted but haven't replied.
 */
async function getContactedInfluencers() {
  return Influencer.find({ status: "CONTACTED", replied: false });
}

/**
 * Mark influencer as contacted.
 */
async function markContacted(username, messageSent) {
  return Influencer.findOneAndUpdate(
    { username },
    {
      status: "CONTACTED",
      contactedAt: new Date(),
      lastMessageSent: messageSent,
    },
    { new: true }
  );
}

/**
 * Mark influencer as replied.
 */
async function markReplied(username) {
  return Influencer.findOneAndUpdate(
    { username },
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
