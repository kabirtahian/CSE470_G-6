const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/loanApplicationController");
const guarantorController = require("../controllers/guarantorController");
const collateralController = require("../controllers/collateralController");
const loanController = require("../controllers/loanController");

const router = express.Router();
router.use(requireAuth);

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.post("/:id/decision", controller.decision);

// FR-08 Guarantor & Collateral Management
router.get("/:id/guarantors", guarantorController.list);
router.post("/:id/guarantors", guarantorController.create);
router.get("/:id/collateral", collateralController.list);
router.post("/:id/collateral", collateralController.create);

// FR-09 Loan Disbursement Management
router.post("/:id/disburse", requireRole("admin", "branch_manager"), loanController.disburse);

module.exports = router;
