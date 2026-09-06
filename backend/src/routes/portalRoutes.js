const express = require("express");
const { requireMemberAuth } = require("../middleware/auth");
const portalController = require("../controllers/portalController");
const paymentController = require("../controllers/paymentController");

const router = express.Router();
router.use(requireMemberAuth);

router.get("/loan-products", portalController.listLoanProducts);

router.get("/loan-applications", portalController.listMyApplications);
router.post("/loan-applications", portalController.createMyApplication);
router.get("/loan-applications/:id", portalController.getMyApplication);

router.get("/loans", portalController.listMyLoans);
router.get("/loans/:id", portalController.getMyLoan);

router.get("/savings-account", portalController.getMySavingsAccount);
router.post("/savings-account", portalController.openMySavingsAccount);

// Payment gateway. config() is read first by the portal so it knows which
// payment UI to render without hardcoding a provider.
router.get("/payments/config", paymentController.config);
router.post("/payments/initiate", paymentController.initiate);
router.get("/payments/:tranId", paymentController.getMine);
router.post("/payments/:tranId/confirm", paymentController.confirm);
router.post("/payments/:tranId/mock-complete", paymentController.mockComplete);

module.exports = router;
