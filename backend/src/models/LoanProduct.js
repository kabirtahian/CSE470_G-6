const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const LoanProduct = sequelize.define(
  "LoanProduct",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    productName: { type: DataTypes.STRING, allowNull: false },
    interestRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    maxAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    tenureMonths: { type: DataTypes.INTEGER, allowNull: false },
    productType: {
      type: DataTypes.ENUM("group", "individual"),
      defaultValue: "group",
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "loan_products" }
);

module.exports = LoanProduct;
