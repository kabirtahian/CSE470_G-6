const express = require("express");
const controller = require("../controllers/chatbotController");

const router = express.Router();

// Public on purpose: the assistant is available to site visitors as well as
// to logged-in borrowers and staff. When a valid token *is* sent, the
// controller uses it to scope in that user's own context - see
// loadMemberContext() in chatbotController.
router.get("/status", controller.status);
router.post("/chat", controller.chat);

module.exports = router;
