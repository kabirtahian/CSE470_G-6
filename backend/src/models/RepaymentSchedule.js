const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// FR-10. Generated in full at disbursement time (see loanController.disburse).
const RepaymentSchedule = sequelize.define(
  "RepaymentSchedule",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    installmentNo: { type: DataTypes.INTEGER, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false },
    amountDue: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "paid", "overdue"),
      defaultValue: "pending",
    },
  },
  { tableName: "repayment_schedules" }
);

module.exports = RepaymentSchedule;
