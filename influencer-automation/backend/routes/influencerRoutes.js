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
  sessionStatus,
  connectInstagram,
  connectStatus,
  cancelConnect,
  disconnectInstagram,
} = require("../controllers/influencerController");

// Stats (before /:id to avoid parameter matching)
router.get("/stats", getStats);

// Session & Instagram connection
router.get("/session-status", sessionStatus);
router.post("/connect-instagram", connectInstagram);
router.get("/connect-status", connectStatus);
router.post("/cancel-connect", cancelConnect);
router.post("/disconnect-instagram", disconnectInstagram);

// Settings
router.get("/settings", getSettings);
router.post("/settings", updateSettings);

// Automation control
router.post("/start-discovery", startDiscovery);
router.post("/start-dm", startDM);
router.post("/start-reply-check", startReplyCheck);
router.post("/stop/:name", stopProcess);
router.post("/stop", stopProcess);

// Influencer CRUD
router.post("/", createInfluencer);
router.get("/", getInfluencers);
router.delete("/:id", deleteInfluencer);

module.exports = router;
