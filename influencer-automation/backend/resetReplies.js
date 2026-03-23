require("./config");
const mongoose = require("mongoose");
const Influencer = require("./models/Influencer");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/influencerBot");

  // Show current state
  const all = await Influencer.find({ status: { $in: ["CONTACTED", "REPLIED"] } }).select("username status replied repliedAt");
  console.log("Current state:");
  all.forEach((i) => console.log("  ", i.username, "| status:", i.status, "| replied:", i.replied));

  // Reset all wrongly-marked replies back to CONTACTED
  const result = await Influencer.updateMany(
    { status: "REPLIED" },
    { status: "CONTACTED", replied: false, repliedAt: null }
  );
  console.log("\nReset", result.modifiedCount, "wrongly-marked REPLIED -> CONTACTED");

  // Also reset any CONTACTED that have replied:true
  const result2 = await Influencer.updateMany(
    { status: "CONTACTED", replied: true },
    { replied: false, repliedAt: null }
  );
  console.log("Reset", result2.modifiedCount, "CONTACTED with replied:true -> false");

  // Show updated state
  const updated = await Influencer.find({ status: { $in: ["CONTACTED", "REPLIED"] } }).select("username status replied");
  console.log("\nAfter reset:");
  updated.forEach((i) => console.log("  ", i.username, "| status:", i.status, "| replied:", i.replied));

  await mongoose.disconnect();
  process.exit(0);
})();
