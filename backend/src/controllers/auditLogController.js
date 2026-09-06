// FR-21 Audit Log & Activity Tracking
const { AuditLog, User } = require("../models");

async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, parseInt(req.query.pageSize, 10) || 25);
    const { rows, count } = await AuditLog.findAndCountAll({
      include: [{ model: User, as: "user", attributes: ["id", "fullName", "email", "role"] }],
      order: [["id", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return res.status(200).json({ auditLogs: rows, total: count, page, pageSize });
  } catch (err) {
    console.error("List audit logs error:", err);
    return res.status(500).json({ message: "Could not list audit logs." });
  }
}

module.exports = { list };
