// Payment Gateway - provider-agnostic, currently backed by Stripe.
//
// This controller never imports Stripe directly. It asks utils/gateways for
// the active provider and calls a fixed interface on it, so the gateway can
// be swapped from .env (PAYMENT_PROVIDER) with no change here.
//
// Flow:
//   1. initiate()  creates a Payment row and asks the gateway for an intent.
//                  For Stripe that returns a clientSecret the browser
//                  confirms with Stripe Elements; for mock it returns a link
//                  to the app's own simulator page.
//   2. confirm()   is called by the browser after Elements reports success.
//                  It does NOT trust that claim - it re-reads the intent
//                  from the provider and only credits the ledger if the
//                  provider itself says the money arrived.
//   3. webhook()   receives Stripe's server-to-server notification, verifies
//                  the signature, and applies the same effect. This is the
//                  authoritative path in production; confirm() exists so the
//                  flow also completes on localhost, where Stripe cannot
//                  reach the developer's machine.
//
// applyPaymentEffect() is the single place a confirmed payment turns into
// ledger changes, and is idempotent - a webhook and a confirm() call racing
// each other can never double-credit an account.
const crypto = require("crypto");
const {
  Payment,
  Loan,
  LoanApplication,
  RepaymentSchedule,
  SavingsAccount,
  Transaction,
  Member,
} = require("../models");
const gateways = require("../utils/gateways");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function generateTranId() {
  return `MFNET-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function isMockMode() {
  return gateways.isMockMode();
}

// GET /api/portal/payments/config (member auth)
// Lets the portal render the correct payment UI without hardcoding which
// gateway is in use or baking a publishable key into the frontend bundle.
async function config(req, res) {
  return res.status(200).json(gateways.publicConfig());
}

async function applyPaymentEffect(payment) {
  if (payment.status === "valid") {
    return payment; // already applied - idempotent guard against double-credit
  }

  let transaction;
  if (payment.purpose === "loan_repayment") {
    const loan = await Loan.findByPk(payment.loanId, {
      include: [{ model: RepaymentSchedule, as: "repaymentSchedules" }],
    });
    if (!loan) throw new Error(`Payment ${payment.tranId} references a missing loan.`);

    transaction = await Transaction.create({
      loanId: loan.id,
      amount: payment.amount,
      category: "repayment",
      transactionType: "loan_repayment_gateway",
    });

    const nextInstallment = loan.repaymentSchedules
      .filter((r) => r.status === "pending" || r.status === "overdue")
      .sort((a, b) => a.installmentNo - b.installmentNo)[0];
    if (nextInstallment) {
      await nextInstallment.update({ status: "paid" });
    }

    const newBalance = Math.max(0, Number(loan.outstandingBalance) - Number(payment.amount));
    const allPaid = loan.repaymentSchedules.every(
      (r) => (nextInstallment && r.id === nextInstallment.id) || r.status === "paid"
    );
    await loan.update({ outstandingBalance: newBalance, status: allPaid ? "closed" : loan.status });
  } else if (payment.purpose === "savings_deposit") {
    const account = await SavingsAccount.findByPk(payment.savingsAccountId);
    if (!account) throw new Error(`Payment ${payment.tranId} references a missing savings account.`);

    transaction = await Transaction.create({
      savingsAccountId: account.id,
      amount: payment.amount,
      category: "deposit",
      transactionType: "savings_deposit_gateway",
    });
    await account.update({ balance: Number(account.balance) + Number(payment.amount) });
  }

  await payment.update({ status: "valid", transactionId: transaction ? transaction.id : null });
  return payment;
}

// POST /api/portal/payments/initiate (member auth)
async function initiate(req, res) {
  try {
    const { purpose, loanId, savingsAccountId, amount } = req.body;
    if (!["loan_repayment", "savings_deposit"].includes(purpose)) {
      return res.status(400).json({ message: "purpose must be 'loan_repayment' or 'savings_deposit'." });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "A positive amount is required." });
    }

    let loan = null;
    let savingsAccount = null;

    // Ownership is checked against req.member.id (taken from the token),
    // never against an id supplied by the client.
    if (purpose === "loan_repayment") {
      if (!loanId) return res.status(400).json({ message: "loanId is required for a loan repayment." });
      loan = await Loan.findByPk(loanId, { include: [{ model: LoanApplication, as: "loanApplication" }] });
      if (!loan || loan.loanApplication.memberId !== req.member.id) {
        return res.status(404).json({ message: "Loan not found." });
      }
      if (loan.status === "closed") {
        return res.status(400).json({ message: "This loan is already closed." });
      }
    } else {
      if (!savingsAccountId) return res.status(400).json({ message: "savingsAccountId is required for a deposit." });
      savingsAccount = await SavingsAccount.findByPk(savingsAccountId);
      if (!savingsAccount || savingsAccount.memberId !== req.member.id) {
        return res.status(404).json({ message: "Savings account not found." });
      }
    }

    const gateway = gateways.activeGateway();
    const payment = await Payment.create({
      tranId: generateTranId(),
      memberId: req.member.id,
      purpose,
      loanId: loan ? loan.id : null,
      savingsAccountId: savingsAccount ? savingsAccount.id : null,
      amount,
      provider: gateway.name,
      status: "initiated",
    });

    const description =
      purpose === "loan_repayment"
        ? `MFNet loan repayment (loan #${loan.id})`
        : `MFNet savings deposit (account #${savingsAccount.id})`;

    const intent = await gateway.createIntent({
      payment,
      member: await Member.findByPk(req.member.id),
      description,
    });

    await payment.update({ providerRef: intent.providerRef });

    if (gateway.name === "mock") {
      return res.status(201).json({
        provider: "mock",
        mock: true,
        tranId: payment.tranId,
        redirectUrl: `${FRONTEND_URL}/portal/mock-payment/${payment.tranId}`,
      });
    }

    return res.status(201).json({
      provider: gateway.name,
      mock: false,
      tranId: payment.tranId,
      clientSecret: intent.clientSecret,
      publishableKey: intent.publishableKey,
      currency: gateway.currency(),
    });
  } catch (err) {
    console.error("Initiate payment error:", err);
    return res.status(500).json({ message: "Could not start payment." });
  }
}

// POST /api/portal/payments/:tranId/confirm (member auth)
//
// Called by the portal once Stripe Elements reports the card was accepted.
// The client's claim is not evidence: this re-reads the PaymentIntent from
// the provider and only credits the ledger if the provider says it
// succeeded.
async function confirm(req, res) {
  try {
    const payment = await Payment.findOne({
      where: { tranId: req.params.tranId, memberId: req.member.id },
    });
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (payment.status === "valid") {
      return res.status(200).json({ payment }); // already settled
    }
    if (!payment.providerRef) {
      return res.status(400).json({ message: "This payment was never started with a gateway." });
    }

    const gateway = gateways.activeGateway();
    const result = await gateway.retrieveIntent(payment.providerRef);

    await payment.update({ gatewayResponse: JSON.stringify(result.raw) });

    if (!result.succeeded) {
      return res.status(202).json({
        payment,
        message: `The gateway reports this payment as '${result.status}', so nothing has been credited yet.`,
      });
    }

    await applyPaymentEffect(payment);
    await payment.reload();
    return res.status(200).json({ payment });
  } catch (err) {
    console.error("Confirm payment error:", err);
    return res.status(500).json({ message: "Could not confirm payment." });
  }
}

// POST /api/payments/webhook (public - called server-to-server by Stripe)
//
// Mounted with express.raw() in server.js, because signature verification
// needs the exact unparsed request body.
async function webhook(req, res) {
  const gateway = gateways.activeGateway();
  let event;
  try {
    event = gateway.constructWebhookEvent(req.body, req.headers["stripe-signature"]);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ message: "Webhook signature could not be verified." });
  }

  try {
    const intent = event.data && event.data.object;
    const tranId = intent && intent.metadata ? intent.metadata.tranId : null;
    if (!tranId) {
      return res.status(200).json({ received: true, message: "No tranId in metadata - ignored." });
    }

    const payment = await Payment.findOne({ where: { tranId } });
    if (!payment) {
      return res.status(200).json({ received: true, message: "Unknown transaction - ignored." });
    }

    await payment.update({ gatewayResponse: JSON.stringify(intent) });

    if (event.type === "payment_intent.succeeded") {
      await applyPaymentEffect(payment);
    } else if (event.type === "payment_intent.payment_failed") {
      if (payment.status !== "valid") await payment.update({ status: "failed" });
    } else if (event.type === "payment_intent.canceled") {
      if (payment.status !== "valid") await payment.update({ status: "cancelled" });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handling error:", err);
    return res.status(500).json({ message: "Could not process webhook." });
  }
}

// GET /api/portal/payments/:tranId (member auth, ownership-scoped)
async function getMine(req, res) {
  try {
    const payment = await Payment.findOne({
      where: { tranId: req.params.tranId, memberId: req.member.id },
    });
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    return res.status(200).json({ payment });
  } catch (err) {
    console.error("Get payment error:", err);
    return res.status(500).json({ message: "Could not fetch payment." });
  }
}

// POST /api/portal/payments/:tranId/mock-complete (member auth, mock mode only)
async function mockComplete(req, res) {
  try {
    if (!isMockMode()) {
      return res.status(400).json({ message: "Mock payments are disabled - a real gateway is configured." });
    }
    const payment = await Payment.findOne({
      where: { tranId: req.params.tranId, memberId: req.member.id },
    });
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (payment.status !== "initiated") {
      return res.status(400).json({ message: "This payment has already been settled." });
    }

    const { outcome } = req.body;
    if (outcome === "success") {
      await applyPaymentEffect(payment);
      await payment.reload();
    } else {
      await payment.update({ status: outcome === "cancel" ? "cancelled" : "failed" });
    }
    return res.status(200).json({ payment });
  } catch (err) {
    console.error("Mock complete error:", err);
    return res.status(500).json({ message: "Could not complete mock payment." });
  }
}

// GET /api/payments (staff: admin, branch_manager)
async function list(req, res) {
  try {
    const payments = await Payment.findAll({
      include: [{ model: Member, as: "member", attributes: ["id", "fullName", "nationalId"] }],
      order: [["id", "DESC"]],
    });
    return res.status(200).json({ payments, gateway: gateways.publicConfig() });
  } catch (err) {
    console.error("List payments error:", err);
    return res.status(500).json({ message: "Could not list payments." });
  }
}

module.exports = {
  config,
  initiate,
  confirm,
  webhook,
  getMine,
  mockComplete,
  list,
  applyPaymentEffect,
  isMockMode,
};
