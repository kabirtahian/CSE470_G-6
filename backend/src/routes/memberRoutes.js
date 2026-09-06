const express = require("express");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const controller = require("../controllers/memberController");
const savingsController = require("../controllers/savingsController");

const router = express.Router();
router.use(requireAuth);

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.patch("/:id", controller.update);
router.patch("/:id/kyc", controller.updateKyc);
router.post("/:id/documents", upload.single("document"), controller.uploadDocument);
router.post("/:id/savings-account", savingsController.open); // FR-12

module.exports = router;
