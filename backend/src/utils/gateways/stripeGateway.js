// Stripe payment gateway adapter.
//
// Implements the provider interface defined in ./index.js. Nothing in this
// file is hardcoded: the secret key, currency, and webhook secret all come
// from environment variables, so rotating a key or switching between test
// and live mode is a .env change with no code edit.
//
// The Stripe client is constructed lazily (on first use) rather than at
// require() time, so the module can be imported safely in environments
// where STRIPE_SECRET_KEY isn't set - e.g. the smoke test, which runs the
// whole app in mock mode with no Stripe credentials at all.
const Stripe = require("stripe");

let client = null;

function isConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function getClient() {
  if (!isConfigured()) {
    throw new Error("STRIPE_SECRET_KEY is not set - cannot reach Stripe.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

// Stripe charges in the currency's smallest unit (cents/paisa), so a
// decimal ledger amount has to be converted before it is sent.
//
// PAYMENT_CURRENCY is env-driven and defaults to "usd". MFNet's ledger is
// BDT-native, but Stripe test accounts are not guaranteed to have BDT
// enabled as a charge currency, so the safe default charges the numeric
// amount in USD while the ledger keeps recording BDT. Set
// PAYMENT_CURRENCY=bdt if your Stripe account supports it.
function currency() {
  return (process.env.PAYMENT_CURRENCY || "usd").toLowerCase();
}

// Zero-decimal currencies are charged as whole units, not hundredths.
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw",
  "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function toMinorUnits(amount) {
  const value = Number(amount);
  if (ZERO_DECIMAL.has(currency())) {
    return Math.round(value);
  }
  return Math.round(value * 100);
}

// Creates the PaymentIntent the borrower's browser will confirm with
// Stripe Elements. The clientSecret is safe to hand to the browser - it
// only authorises confirming this one intent, never any other API call.
//
// tranId is stored in metadata so a webhook arriving later can be matched
// back to the local Payment row without trusting anything the client says.
async function createIntent({ payment, member, description }) {
  const intent = await getClient().paymentIntents.create({
    amount: toMinorUnits(payment.amount),
    currency: currency(),
    description,
    metadata: {
      tranId: payment.tranId,
      memberId: String(payment.memberId),
      purpose: payment.purpose,
      ledgerAmountBDT: String(payment.amount),
    },
    automatic_payment_methods: { enabled: true },
    receipt_email: member && member.email ? member.email : undefined,
  });

  return {
    providerRef: intent.id,
    clientSecret: intent.client_secret,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
  };
}

// Server-side truth check. Never trust the browser's word that a payment
// succeeded - re-read the intent straight from Stripe and let its own
// status decide.
async function retrieveIntent(providerRef) {
  const intent = await getClient().paymentIntents.retrieve(providerRef);
  return {
    raw: intent,
    succeeded: intent.status === "succeeded",
    status: intent.status,
    tranId: intent.metadata ? intent.metadata.tranId : null,
  };
}

// Verifies a webhook really came from Stripe using the signing secret.
// An unverified webhook body is never acted on.
function constructWebhookEvent(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set - refusing to trust this webhook.");
  }
  return getClient().webhooks.constructEvent(rawBody, signature, secret);
}

module.exports = {
  name: "stripe",
  isConfigured,
  createIntent,
  retrieveIntent,
  constructWebhookEvent,
  currency,
  toMinorUnits,
};
