const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/reportController");

router.get("/export/csv", ctrl.exportCSV);
router.get("/funnel", ctrl.getConversionFunnel);
router.get("/response-rates", ctrl.getResponseRates);
router.get("/hashtag-performance", ctrl.getHashtagPerformance);
router.get("/performance-over-time", ctrl.getPerformanceOverTime);

module.exports = router;
