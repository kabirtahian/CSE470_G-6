const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/userController");

const router = express.Router();
router.use(requireAuth);

router.get("/", controller.list);

module.exports = router;
