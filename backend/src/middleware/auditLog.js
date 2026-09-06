// Fires after any successful mutating request (POST/PATCH/DELETE) on a
// mounted route and writes one AuditLog row. Deliberately does not log GET
// requests - that would be noise, not an audit trail (see MASTER_PROMPT
// FR-21). "Successful" means the response left a 2xx status code.
const { AuditLog } = require("../models");

function auditLog(action) {
  return (req, res, next) => {
    res.on("finish", () => {
      if (!req.user) return;
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      AuditLog.create({
        action,
        userId: req.user.id,
      }).catch((err) => console.error("AuditLog write error:", err));
    });
    next();
  };
}

module.exports = auditLog;
