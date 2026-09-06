const jwt = require("jsonwebtoken");

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, branchId: user.branchId, type: "staff" },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

// Borrower Portal addition. A separate token "type" (staff vs member) is
// deliberate: a staff User and a Member are different tables with
// independently-assigned auto-increment ids, so a Member id=3 and a
// User id=3 can both exist. Without a type check, a member's token could
// be replayed against staff-only endpoints (or vice versa) and
// User.findByPk(3) / Member.findByPk(3) would silently authenticate as
// the wrong party. requireAuth and requireMemberAuth both check this
// field and reject a token of the wrong type outright.
function signMemberToken(member) {
  return jwt.sign(
    { id: member.id, type: "member" },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
}

module.exports = { signToken, signMemberToken, verifyToken };
