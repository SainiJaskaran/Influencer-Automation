const Influencer = require("../models/Influencer");
const ActivityLog = require("../models/ActivityLog");

exports.exportCSV = async (req, res) => {
  try {
    const { status, campaignId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (campaignId) filter.campaignId = campaignId;

    const influencers = await Influencer.find(filter).sort({ createdAt: -1 }).lean();

    // Build CSV manually to avoid extra dependency
    const headers = [
      "Username", "Followers", "Engagement Rate", "Estimated Reach",
      "Quality", "Score", "Niche", "Source Hashtag", "Status",
      "Contacted At", "Replied At", "Bio",
    ];

    const rows = influencers.map((inf) => [
      inf.username || "",
      inf.followersCount || inf.followers || 0,
      inf.engagementRate || 0,
      inf.estimatedReach || 0,
      inf.fakeStatus || "",
      inf.score || 0,
      inf.niche || "",
      inf.sourceHashtag || "",
      inf.status || "",
      inf.contactedAt ? new Date(inf.contactedAt).toISOString() : "",
      inf.repliedAt ? new Date(inf.repliedAt).toISOString() : "",
      (inf.bio || "").replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    const date = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=influencers-${date}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getConversionFunnel = async (req, res) => {
  try {
    const { campaignId } = req.query;
    const match = campaignId ? { campaignId } : {};

    const total = await Influencer.countDocuments(match);
    const contacted = await Influencer.countDocuments({ ...match, status: { $in: ["CONTACTED", "REPLIED", "DEAL"] } });
    const replied = await Influencer.countDocuments({ ...match, status: { $in: ["REPLIED", "DEAL"] } });
    const deals = await Influencer.countDocuments({ ...match, status: "DEAL" });

    res.json({
      funnel: [
        { stage: "Discovered", count: total },
        { stage: "Contacted", count: contacted },
        { stage: "Replied", count: replied },
        { stage: "Deal", count: deals },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getResponseRates = async (req, res) => {
  try {
    // Group by week using contactedAt
    const pipeline = await Influencer.aggregate([
      { $match: { contactedAt: { $ne: null } } },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$contactedAt" },
            week: { $isoWeek: "$contactedAt" },
          },
          contacted: { $sum: 1 },
          replied: {
            $sum: { $cond: [{ $in: ["$status", ["REPLIED", "DEAL"]] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    const rates = pipeline.map((entry) => ({
      period: `${entry._id.year}-W${String(entry._id.week).padStart(2, "0")}`,
      contacted: entry.contacted,
      replied: entry.replied,
      rate: entry.contacted > 0 ? parseFloat(((entry.replied / entry.contacted) * 100).toFixed(1)) : 0,
    }));

    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getHashtagPerformance = async (req, res) => {
  try {
    const pipeline = await Influencer.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$sourceHashtag", "$niche"] },
          discovered: { $sum: 1 },
          contacted: {
            $sum: { $cond: [{ $in: ["$status", ["CONTACTED", "REPLIED", "DEAL"]] }, 1, 0] },
          },
          replied: {
            $sum: { $cond: [{ $in: ["$status", ["REPLIED", "DEAL"]] }, 1, 0] },
          },
          avgScore: { $avg: "$score" },
          avgEngagement: { $avg: "$engagementRate" },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { discovered: -1 } },
    ]);

    const results = pipeline.map((entry) => ({
      hashtag: entry._id,
      discovered: entry.discovered,
      contacted: entry.contacted,
      replied: entry.replied,
      conversionRate: entry.contacted > 0 ? parseFloat(((entry.replied / entry.contacted) * 100).toFixed(1)) : 0,
      avgScore: Math.round(entry.avgScore || 0),
      avgEngagement: parseFloat((entry.avgEngagement || 0).toFixed(2)),
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPerformanceOverTime = async (req, res) => {
  try {
    const pipeline = await ActivityLog.aggregate([
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            actionType: "$actionType",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Reshape into { date, dm_sent, profile_visited, ... }
    const dateMap = {};
    for (const entry of pipeline) {
      const date = entry._id.date;
      if (!dateMap[date]) {
        dateMap[date] = { date, dm_sent: 0, profile_visited: 0, search_performed: 0, reply_checked: 0, discovery_run: 0 };
      }
      dateMap[date][entry._id.actionType] = entry.count;
    }

    res.json(Object.values(dateMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
