const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Borrower Portal / Payment Gateway addition. Records every payment
// attempt, independent of whether it succeeds - this is the audit trail
// for gateway activity, separate from the Transaction ledger which only
// gets a row once a payment is actually confirmed by the provider.
//
// The provider/providerRef columns keep this table gateway-agnostic: the
// same row shape describes a Stripe PaymentIntent, a mock payment, or any
// future provider, so swapping gateways needs no schema change.
const Payment = sequelize.define(
  "Payment",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tranId: { type: DataTypes.STRING, allowNull: false, unique: true },
    purpose: {
      type: DataTypes.ENUM("loan_repayment", "savings_deposit"),
      allowNull: false,
    },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.STRING, defaultValue: "BDT" },
    status: {
      type: DataTypes.ENUM("initiated", "valid", "failed", "cancelled"),
      defaultValue: "initiated",
    },
    // Which gateway handled this attempt ("stripe", "mock", ...).
    provider: { type: DataTypes.STRING, allowNull: true },
    // The provider's own id for this attempt (e.g. a Stripe PaymentIntent
    // id). Used to re-verify status server-side before crediting anything.
    providerRef: { type: DataTypes.STRING, allowNull: true },
    gatewayResponse: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "payments" }
);

module.exports = Payment;
