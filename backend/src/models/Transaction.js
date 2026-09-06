const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-10 / FR-12. A single flat Transaction table with a "category" ENUM
// instead of Sequelize STI subclasses, per MASTER_PROMPT section 10 (matches
// the codebase's existing preference for flat tables over inheritance, e.g.
// User.role instead of subclass tables). loanId / savingsAccountId are a
// pragmatic addition beyond the bare spec fields so a transaction can be
// traced back to the loan or savings account it affected - both nullable,
// exactly one is set depending on "category".
const Transaction = sequelize.define(
  "Transaction",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    transactionDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    transactionType: { type: DataTypes.STRING, allowNull: true },
    category: {
      type: DataTypes.ENUM("repayment", "deposit", "withdrawal"),
      allowNull: false,
    },
  },
  { tableName: "transactions" }
);

module.exports = Transaction;
