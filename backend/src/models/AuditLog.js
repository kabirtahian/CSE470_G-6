const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-21.
const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    action: { type: DataTypes.STRING, allowNull: false },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "audit_logs" }
);

module.exports = AuditLog;
