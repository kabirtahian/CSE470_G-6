const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-18. Donor<->Branch is implemented as this join-like Contribution
// entity (with its own amount/date) rather than a bare M:N, per
// MASTER_PROMPT section 10.
const Contribution = sequelize.define(
  "Contribution",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    contributionDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  },
  { tableName: "contributions" }
);

module.exports = Contribution;
