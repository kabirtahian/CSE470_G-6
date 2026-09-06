const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Group = sequelize.define(
  "Group",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    groupName: { type: DataTypes.STRING, allowNull: false },
  },
  { tableName: "groups" }
);

module.exports = Group;
