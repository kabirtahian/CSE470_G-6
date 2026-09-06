// Borrower Portal auth. A Member record already exists (created by staff
// via POST /api/members) before a borrower can ever "register" here -
// register() only activates portal access on an existing record, verified
// by nationalId + the phone number already on file, then lets the member
// set a password. This avoids needing a separate SMS/OTP provider while
// still confirming the person claiming the account is who staff registered.
const bcrypt = require("bcryptjs");
const { Member } = require("../models");
const { signMemberToken } = require("../utils/token");

function sanitize(member) {
  const { passwordHash, ...rest } = member.toJSON();
  return rest;
}

async function register(req, res) {
  try {
    const { nationalId, phone, password } = req.body;
    if (!nationalId || !phone || !password) {
      return res.status(400).json({ message: "nationalId, phone and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    const member = await Member.unscoped().findOne({ where: { nationalId } });
    if (!member) {
      return res.status(404).json({
        message: "No member record found with this National ID. Please visit your branch to be registered first.",
      });
    }
    if (member.passwordHash) {
      return res.status(409).json({ message: "Portal access is already set up for this member. Please log in instead." });
    }
    if (!member.phone) {
      return res.status(400).json({
        message: "Your branch hasn't recorded a phone number for you yet. Please contact them before setting up portal access.",
      });
    }
    if (member.phone.trim() !== String(phone).trim()) {
      return res.status(400).json({ message: "Phone number does not match our records for this member." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await member.update({ passwordHash });
    const token = signMemberToken(member);
    return res.status(201).json({ message: "Portal access created.", token, member: sanitize(member) });
  } catch (err) {
    console.error("Portal register error:", err);
    return res.status(500).json({ message: "Could not set up portal access." });
  }
}

async function login(req, res) {
  try {
    const { nationalId, password } = req.body;
    if (!nationalId || !password) {
      return res.status(400).json({ message: "nationalId and password are required." });
    }
    const member = await Member.unscoped().findOne({ where: { nationalId } });
    if (!member || !member.passwordHash) {
      return res.status(401).json({ message: "Invalid National ID or password." });
    }
    const match = await bcrypt.compare(password, member.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid National ID or password." });
    }
    const token = signMemberToken(member);
    return res.status(200).json({ message: "Logged in successfully.", token, member: sanitize(member) });
  } catch (err) {
    console.error("Portal login error:", err);
    return res.status(500).json({ message: "Could not log in." });
  }
}

async function me(req, res) {
  try {
    return res.status(200).json({ member: sanitize(req.member) });
  } catch (err) {
    console.error("Portal me error:", err);
    return res.status(500).json({ message: "Could not fetch profile." });
  }
}

module.exports = { register, login, me, sanitize };
