const config = require("../config");

/**
 * Replace {key} placeholders in a template with data values.
 */
function generateMessage(template, data) {
  let message = template;
  for (const key in data) {
    message = message.replace(new RegExp(`\\{${key}\\}`, "g"), data[key]);
  }
  return message.trim();
}

/**
 * Get a random message template from config.
 */
function getRandomTemplate() {
  const templates = config.messageTemplates;
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Build a personalized outreach message for an influencer.
 */
function buildOutreachMessage(influencer) {
  const template = getRandomTemplate();
  return generateMessage(template, {
    name: influencer.name || influencer.username,
    niche: influencer.niche || "content",
  });
}

module.exports = { generateMessage, getRandomTemplate, buildOutreachMessage };
