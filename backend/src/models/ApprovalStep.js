const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ApprovalStep = sequelize.define(
  "ApprovalStep",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    stage: {
      type: DataTypes.ENUM("loan_officer", "branch_manager", "admin"),
      allowNull: false,
    },
    decision: {
      type: DataTypes.ENUM("approved", "rejected"),
      allowNull: false,
    },
    comments: { type: DataTypes.STRING, allowNull: true },
    actionDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "approval_steps" }
);

module.exports = ApprovalStep;
