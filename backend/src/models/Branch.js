const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Branch = sequelize.define(
  "Branch",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    branchName: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: true },
    contactNumber: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: "branches" }
);

module.exports = Branch;
