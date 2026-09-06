const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/loanProductController");

const router = express.Router();
router.use(requireAuth);

router.get("/", controller.list);
router.post("/", requireRole("admin"), controller.create);
router.patch("/:id", requireRole("admin"), controller.update);

module.exports = router;
