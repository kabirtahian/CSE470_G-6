const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-13.
const Expense = sequelize.define(
  "Expense",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    expenseDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    description: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: "expenses" }
);

module.exports = Expense;
