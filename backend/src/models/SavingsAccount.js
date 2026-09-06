const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-12.
const SavingsAccount = sequelize.define(
  "SavingsAccount",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    openDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    status: {
      type: DataTypes.ENUM("active", "closed"),
      defaultValue: "active",
    },
  },
  { tableName: "savings_accounts" }
);

module.exports = SavingsAccount;
