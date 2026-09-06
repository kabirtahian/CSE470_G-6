const express = require("express");
const { register, login, me } = require("../controllers/portalAuthController");
const { requireMemberAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireMemberAuth, me);

module.exports = router;
