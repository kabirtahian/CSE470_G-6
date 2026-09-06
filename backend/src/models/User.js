const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    role: {
      type: DataTypes.ENUM("admin", "branch_manager", "loan_officer", "cashier"),
      defaultValue: "loan_officer",
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "users" }
);

module.exports = User;
