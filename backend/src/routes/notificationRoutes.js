const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/notificationController");

const router = express.Router();
router.use(requireAuth);

router.get("/", controller.list);
router.patch("/:id/read", controller.markRead);

module.exports = router;
