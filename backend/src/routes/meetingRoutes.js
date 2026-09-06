const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/meetingController");

const router = express.Router();
router.use(requireAuth);

router.get("/", controller.list);
router.patch("/:id", controller.update);

module.exports = router;
