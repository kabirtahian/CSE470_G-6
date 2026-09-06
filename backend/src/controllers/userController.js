const { User } = require("../models");

async function list(req, res) {
  try {
    const where = {};
    if (req.query.role) where.role = req.query.role;
    const users = await User.findAll({
      where,
      attributes: ["id", "fullName", "email", "role"],
      order: [["id", "ASC"]],
    });
    return res.status(200).json({ users });
  } catch (err) {
    console.error("List users error:", err);
    return res.status(500).json({ message: "Could not list users." });
  }
}

module.exports = { list };
