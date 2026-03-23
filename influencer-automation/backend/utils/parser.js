/**
 * Convert follower string to number.
 * "66.4K" → 66400, "1.2M" → 1200000, "1,234" → 1234, "500" → 500
 */
function parseFollowers(raw) {
  if (typeof raw === "number") return raw;
  if (!raw || typeof raw !== "string") return 0;

  let text = raw.trim().replace(/,/g, "").replace(/followers/i, "").trim();

  const multipliers = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
  const match = text.match(/^([\d.]+)\s*([KMB])?$/i);

  if (!match) return 0;

  const num = parseFloat(match[1]);
  const suffix = (match[2] || "").toUpperCase();
  const multiplier = multipliers[suffix] || 1;

  return Math.round(num * multiplier);
}

/**
 * Check if a profile passes the influencer quality filters.
 */
function passesFilters(followerCount, bio, filters, currentHashtag) {
  // Follower range check
  if (followerCount < filters.minFollowers || followerCount > filters.maxFollowers) {
    return { pass: false, reason: `Followers ${followerCount} outside range ${filters.minFollowers}-${filters.maxFollowers}` };
  }

  // Niche keyword check (if bio available and not explicitly skipped)
  if (!filters.skipNicheCheck) {
    // Auto-include the current hashtag as a valid niche keyword
    const nicheKeywords = filters.nicheKeywords ? [...filters.nicheKeywords] : [];
    if (currentHashtag && !nicheKeywords.includes(currentHashtag.toLowerCase())) {
      nicheKeywords.push(currentHashtag.toLowerCase());
    }

    if (bio && nicheKeywords.length > 0) {
      const bioLower = bio.toLowerCase();
      const hasNiche = nicheKeywords.some((kw) => bioLower.includes(kw));
      if (!hasNiche) {
        return { pass: false, reason: `Bio does not match niche keywords` };
      }
    }
  }

  return { pass: true };
}

module.exports = { parseFollowers, passesFilters };
