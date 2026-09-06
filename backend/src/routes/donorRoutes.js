const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/donorController");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("admin"));

router.get("/", controller.list);
router.post("/", controller.create);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);
router.post("/:id/contributions", controller.addContribution);

module.exports = router;
