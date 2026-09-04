const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-08. PK is named collateralId per MASTER_PROMPT section 10.
const Collateral = sequelize.define(
  "Collateral",
  {
    collateralId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    description: { type: DataTypes.STRING, allowNull: false },
    estimatedValue: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  },
  { tableName: "collaterals" }
);

module.exports = Collateral;
