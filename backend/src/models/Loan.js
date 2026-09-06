const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-09. Created only when a LoanApplication.status becomes "approved" and
// is disbursed via POST /api/loan-applications/:id/disburse.
const Loan = sequelize.define(
  "Loan",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    principal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    interestRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    disbursedDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    tenureMonths: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM("active", "closed", "defaulted"),
      defaultValue: "active",
    },
    outstandingBalance: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  },
  { tableName: "loans" }
);

module.exports = Loan;
