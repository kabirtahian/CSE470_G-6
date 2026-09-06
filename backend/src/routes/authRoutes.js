const express = require("express");
const { body } = require("express-validator");
const { register, login, me } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/register",
  [
    body("fullName").notEmpty().withMessage("fullName is required."),
    body("email").isEmail().withMessage("A valid email is required."),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  ],
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("A valid email is required."),
    body("password").notEmpty().withMessage("password is required."),
  ],
  login
);

router.get("/me", requireAuth, me);

module.exports = router;
