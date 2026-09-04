const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const LoanApplication = sequelize.define(
  "LoanApplication",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    requestedAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    purpose: { type: DataTypes.STRING, allowNull: true },
    applicationDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
    currentStageIndex: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: "loan_applications" }
);

module.exports = LoanApplication;
