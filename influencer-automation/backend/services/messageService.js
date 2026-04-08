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
 * Get a random message template from the provided list or config defaults.
 */
function getRandomTemplate(templates) {
  const list = templates && templates.length ? templates : config.messageTemplates;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Build a personalized outreach message for an influencer.
 * Accepts optional templates array for per-user customization.
 */
function buildOutreachMessage(influencer, templates) {
  const template = getRandomTemplate(templates);
  return generateMessage(template, {
    name: influencer.name || influencer.username,
    niche: influencer.niche || "content",
  });
}

module.exports = { generateMessage, getRandomTemplate, buildOutreachMessage };
