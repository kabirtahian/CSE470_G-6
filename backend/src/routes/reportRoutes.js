const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/reportController");

const router = express.Router();
router.use(requireAuth);

router.get("/summary", controller.summary);

module.exports = router;
