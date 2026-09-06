const { verifyToken } = require("../utils/token");
const { User, Member } = require("../models");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const payload = verifyToken(token);
    if (payload.type !== "staff") {
      return res.status(401).json({ message: "Invalid or expired session." });
    }
    const user = await User.findByPk(payload.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid or expired session." });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }
    next();
  };
}

// Borrower Portal addition - the member-side equivalent of requireAuth.
// Deliberately separate from requireAuth/req.user rather than reusing it,
// so staff and borrower auth can never be confused for one another (see
// the comment on signMemberToken in utils/token.js).
async function requireMemberAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const payload = verifyToken(token);
    if (payload.type !== "member") {
      return res.status(401).json({ message: "Invalid or expired session." });
    }
    const member = await Member.findByPk(payload.id);
    if (!member) {
      return res.status(401).json({ message: "Invalid or expired session." });
    }
    req.member = member;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

module.exports = { requireAuth, requireRole, requireMemberAuth };
