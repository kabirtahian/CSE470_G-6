const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Member = sequelize.define(
  "Member",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    nationalId: { type: DataTypes.STRING, allowNull: false, unique: true },
    address: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    dob: { type: DataTypes.DATEONLY, allowNull: true },
    joinDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    kycStatus: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      defaultValue: "pending",
    },
    // Borrower Portal (new). Nullable - a member registered by staff has no
    // portal access until they "activate" it themselves via
    // POST /api/portal/auth/register (verifies nationalId + phone on file,
    // then lets them set a password).
    passwordHash: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "members",
    // SECURITY: passwordHash is excluded at the model level so it can never
    // be returned by accident. The comment above used to claim it was
    // "never returned by any endpoint" - that was not actually true, because
    // controllers eagerly loading Member were shipping the bcrypt hash to
    // the client. A defaultScope makes the claim structurally true instead
    // of relying on every future query remembering to exclude it.
    //
    // The two places that legitimately need the hash (portal activation and
    // portal login, both in portalAuthController) use Member.unscoped().
    defaultScope: {
      attributes: { exclude: ["passwordHash"] },
    },
    scopes: {
      withPassword: { attributes: { include: ["passwordHash"] } },
    },
  }
);

module.exports = Member;
