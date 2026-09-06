const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/expenseController");

const router = express.Router();
router.use(requireAuth);

router.get("/", controller.list);
router.post("/", requireRole("admin", "branch_manager"), controller.create);
router.patch("/:id", requireRole("admin", "branch_manager"), controller.update);
router.delete("/:id", requireRole("admin", "branch_manager"), controller.remove);

module.exports = router;
