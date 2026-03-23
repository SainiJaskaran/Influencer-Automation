const express = require("express");
const router = express.Router();

const {
  createInfluencer,
  getInfluencers,
  getStats,
  startDiscovery,
  startDM,
  startReplyCheck,
  stopProcess,
  getSettings,
  updateSettings,
  deleteInfluencer,
} = require("../controllers/influencerController");

// Influencer CRUD
router.post("/", createInfluencer);
router.get("/", getInfluencers);
router.delete("/:id", deleteInfluencer);

// Stats
router.get("/stats", getStats);

// Automation control
router.post("/start-discovery", startDiscovery);
router.post("/start-dm", startDM);
router.post("/start-reply-check", startReplyCheck);
router.post("/stop/:name", stopProcess);
router.post("/stop", stopProcess);

// Settings
router.get("/settings", getSettings);
router.post("/settings", updateSettings);

module.exports = router;
