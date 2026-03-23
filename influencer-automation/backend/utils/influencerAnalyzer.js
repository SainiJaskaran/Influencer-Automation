const { parseFollowers } = require("./parser");

/**
 * Calculate engagement rate.
 * @param {number} likes - Average likes per post
 * @param {number} comments - Average comments per post
 * @param {number} followers - Total followers count
 * @returns {number} Engagement rate as percentage (e.g. 4.5)
 */
function calculateEngagement(likes, comments, followers) {
  if (!followers || followers === 0) return 0;
  return parseFloat((((likes + comments) / followers) * 100).toFixed(2));
}

/**
 * Estimate reach based on follower count.
 * @param {number} followers
 * @returns {number}
 */
function estimateReach(followers) {
  if (!followers) return 0;
  return Math.round(followers * 0.3);
}

/**
 * Detect fake follower likelihood based on engagement rate.
 * @param {number} engagementRate - Engagement percentage
 * @returns {string} HIGH_FAKE | LOW_QUALITY | GOOD | EXCELLENT
 */
function detectFakeStatus(engagementRate) {
  if (engagementRate < 2) return "HIGH_FAKE";
  if (engagementRate < 4) return "LOW_QUALITY";
  if (engagementRate < 6) return "GOOD";
  return "EXCELLENT";
}

/**
 * Calculate overall influencer score (0-100).
 * Combines engagement quality and reach potential.
 * @param {number} engagementRate
 * @param {number} reach
 * @returns {number}
 */
function calculateScore(engagementRate, reach) {
  // Engagement component: 60% weight, capped at 10% ER
  const engScore = Math.min(engagementRate / 10, 1) * 60;

  // Reach component: 40% weight, log-scaled (10K=0, 1M=40)
  const reachScore = reach > 0
    ? Math.min(Math.log10(reach) / Math.log10(1_000_000), 1) * 40
    : 0;

  return Math.round(engScore + reachScore);
}

/**
 * Full analysis pipeline — takes raw scrape data and returns analytics.
 * @param {object} data - { followers, avgLikes, avgComments }
 *   followers can be string ("66.4K") or number
 * @returns {object} { followersCount, engagementRate, estimatedReach, fakeStatus, score }
 */
function analyzeInfluencer(data) {
  const followersCount = typeof data.followers === "string"
    ? parseFollowers(data.followers)
    : (data.followers || 0);

  const avgLikes = data.avgLikes || 0;
  const avgComments = data.avgComments || 0;

  const engagementRate = calculateEngagement(avgLikes, avgComments, followersCount);
  const estimatedReach = estimateReach(followersCount);
  const fakeStatus = detectFakeStatus(engagementRate);
  const score = calculateScore(engagementRate, estimatedReach);

  return {
    followersCount,
    engagementRate,
    estimatedReach,
    fakeStatus,
    score,
  };
}

module.exports = {
  calculateEngagement,
  estimateReach,
  detectFakeStatus,
  calculateScore,
  analyzeInfluencer,
};
