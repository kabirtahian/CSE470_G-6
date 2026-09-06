const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/adminController");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("admin"));

router.post("/run-overdue-check", controller.runOverdueCheck);

module.exports = router;
