const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { signToken } = require("../utils/token");

function sanitize(user) {
  const { passwordHash, ...rest } = user.toJSON();
  return rest;
}

async function register(req, res) {
  try {
    const { fullName, email, phone, password, role } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      email,
      phone,
      passwordHash,
      role: role || "loan_officer",
    });
    const token = signToken(user);
    return res.status(201).json({ message: "Registered successfully.", token, user: sanitize(user) });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Could not register." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }
    const user = await User.findOne({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const token = signToken(user);
    return res.status(200).json({ message: "Logged in successfully.", token, user: sanitize(user) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Could not log in." });
  }
}

async function me(req, res) {
  try {
    return res.status(200).json({ user: sanitize(req.user) });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ message: "Could not fetch profile." });
  }
}

module.exports = { register, login, me, sanitize };
