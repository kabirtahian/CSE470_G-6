const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/auditLogController");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("admin"));

router.get("/", controller.list);

module.exports = router;
