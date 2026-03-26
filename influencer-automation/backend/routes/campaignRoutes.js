const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/campaignController");

router.post("/", ctrl.create);
router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getOne);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/start", ctrl.start);
router.post("/:id/pause", ctrl.pause);
router.post("/:id/run", ctrl.runNow);

module.exports = router;
