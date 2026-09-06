const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-18.
const Donor = sequelize.define(
  "Donor",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    donorName: { type: DataTypes.STRING, allowNull: false },
    contactInfo: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: "donors" }
);

module.exports = Donor;
