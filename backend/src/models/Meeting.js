const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-16.
const Meeting = sequelize.define(
  "Meeting",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    scheduledDate: { type: DataTypes.DATE, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("scheduled", "completed", "cancelled"),
      defaultValue: "scheduled",
    },
  },
  { tableName: "meetings" }
);

module.exports = Meeting;
