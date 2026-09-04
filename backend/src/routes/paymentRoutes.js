const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/paymentController");

const router = express.Router();

// Public - called server-to-server by the payment provider, never by a
// logged-in session. The raw body parser needed for signature verification
// is applied in server.js, before express.json() can consume the stream.
router.post("/webhook", controller.webhook);

// Staff visibility into every gateway payment attempt.
router.get("/", requireAuth, requireRole("admin", "branch_manager"), controller.list);

module.exports = router;
