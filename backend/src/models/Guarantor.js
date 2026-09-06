const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-08. PK is named guarantorId (not "id") per MASTER_PROMPT section 10 -
// an intentional, explicit exception to the rest of the schema's "id" PK
// convention, kept as specified.
const Guarantor = sequelize.define(
  "Guarantor",
  {
    guarantorId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    relationToApplicant: { type: DataTypes.STRING, allowNull: true },
    contactNumber: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: "guarantors" }
);

module.exports = Guarantor;
