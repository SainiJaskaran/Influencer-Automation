const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/safetyController");

router.get("/dashboard", ctrl.getDashboard);
router.get("/activity", ctrl.getActivity);
router.post("/limits", ctrl.updateLimits);

module.exports = router;
