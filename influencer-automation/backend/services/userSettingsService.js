const UserSettings = require("../models/UserSettings");
const config = require("../config");

async function getUserSettings(userId) {
  let settings = await UserSettings.findOne({ userId });
  if (!settings) {
    settings = await UserSettings.create({
      userId,
      hashtags: config.hashtags,
      maxPostsPerHashtag: config.maxPostsPerHashtag,
      dmBatchSize: config.dmBatchSize,
      filters: { ...config.filters },
      rateLimits: { ...config.rateLimits },
      messageTemplates: [...config.messageTemplates],
    });
  }
  return settings;
}

async function updateUserSettings(userId, updates) {
  const setObj = { updatedAt: new Date() };

  if (updates.hashtags !== undefined) setObj.hashtags = updates.hashtags;
  if (updates.maxPostsPerHashtag !== undefined) setObj.maxPostsPerHashtag = updates.maxPostsPerHashtag;
  if (updates.dmBatchSize !== undefined) setObj.dmBatchSize = updates.dmBatchSize;
  if (updates.filters !== undefined) setObj.filters = updates.filters;
  if (updates.rateLimits !== undefined) setObj.rateLimits = updates.rateLimits;
  if (updates.messageTemplates !== undefined) setObj.messageTemplates = updates.messageTemplates;

  return UserSettings.findOneAndUpdate(
    { userId },
    { $set: setObj },
    { upsert: true, new: true }
  );
}

async function getUserConfig(userId) {
  const settings = await getUserSettings(userId);
  const userConfig = JSON.parse(JSON.stringify(config.loadConfig()));

  if (settings.hashtags && settings.hashtags.length) userConfig.hashtags = settings.hashtags;
  if (settings.maxPostsPerHashtag) userConfig.maxPostsPerHashtag = settings.maxPostsPerHashtag;
  if (settings.dmBatchSize) userConfig.dmBatchSize = settings.dmBatchSize;
  if (settings.filters) {
    const f = settings.filters.toObject ? settings.filters.toObject() : settings.filters;
    Object.assign(userConfig.filters, f);
  }
  if (settings.rateLimits) {
    const r = settings.rateLimits.toObject ? settings.rateLimits.toObject() : settings.rateLimits;
    for (const key of Object.keys(r)) {
      if (r[key] && (r[key].perHour || r[key].perDay)) {
        userConfig.rateLimits[key] = { ...userConfig.rateLimits[key], ...r[key] };
      }
    }
  }
  if (settings.messageTemplates && settings.messageTemplates.length) {
    userConfig.messageTemplates = settings.messageTemplates;
  }

  return userConfig;
}

module.exports = { getUserSettings, updateUserSettings, getUserConfig };
