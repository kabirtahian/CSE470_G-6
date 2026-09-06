const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-17. In-app notifications only (no real SMS/email provider integration
// for this course project) - see MASTER_PROMPT section 10.
const Notification = sequelize.define(
  "Notification",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    message: { type: DataTypes.STRING, allowNull: false },
    channel: {
      type: DataTypes.ENUM("sms", "email", "in_app"),
      defaultValue: "in_app",
    },
    sentDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    status: {
      type: DataTypes.ENUM("unread", "read"),
      defaultValue: "unread",
    },
  },
  { tableName: "notifications" }
);

module.exports = Notification;
