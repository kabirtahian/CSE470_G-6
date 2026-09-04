const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/loanController");

const router = express.Router();
router.use(requireAuth);

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/:id/repayments", controller.recordRepayment); // FR-10

module.exports = router;
