const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/savingsController");

const router = express.Router();
router.use(requireAuth);

router.get("/", controller.list);
router.post("/:id/deposit", controller.deposit);
router.post("/:id/withdraw", controller.withdraw);

module.exports = router;
