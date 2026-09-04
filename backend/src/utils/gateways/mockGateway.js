// Mock payment gateway adapter.
//
// Implements the same interface as stripeGateway.js but never leaves the
// machine. Used when PAYMENT_PROVIDER=mock, or automatically whenever the
// selected real provider has no credentials configured, so the whole
// apply -> pay -> confirm loop stays demoable and testable with no Stripe
// account and no internet connection.
//
// The borrower is sent to the app's own /portal/mock-payment/:tranId page,
// which can simulate success, cancellation, or failure and then calls the
// exact same applyPaymentEffect() ledger path the real gateway uses.
function isConfigured() {
  return true; // the mock is always available - that is the point of it
}

async function createIntent({ payment }) {
  return {
    providerRef: `MOCK-${payment.tranId}`,
    clientSecret: null,
    publishableKey: null,
  };
}

// In mock mode a payment is only ever "succeeded" once the simulator page
// explicitly says so, which it does through the mock-complete endpoint
// rather than through this method.
async function retrieveIntent(providerRef) {
  return {
    raw: { id: providerRef, provider: "mock" },
    succeeded: false,
    status: "requires_payment_method",
    tranId: String(providerRef).replace(/^MOCK-/, ""),
  };
}

function constructWebhookEvent() {
  throw new Error("The mock gateway does not receive webhooks.");
}

module.exports = {
  name: "mock",
  isConfigured,
  createIntent,
  retrieveIntent,
  constructWebhookEvent,
  currency: () => (process.env.PAYMENT_CURRENCY || "bdt").toLowerCase(),
  toMinorUnits: (amount) => Math.round(Number(amount) * 100),
};
