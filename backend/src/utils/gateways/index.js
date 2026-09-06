// Payment gateway registry.
//
// paymentController never imports a specific provider - it asks this module
// for "the active gateway" and calls a fixed interface on whatever comes
// back. Adding a provider means writing one adapter file and adding one
// line to PROVIDERS below; no controller, route, or frontend code changes.
//
// Provider interface (see stripeGateway.js / mockGateway.js):
//   name                                -> string
//   isConfigured()                      -> boolean
//   createIntent({ payment, member, description })
//                                       -> { providerRef, clientSecret, publishableKey }
//   retrieveIntent(providerRef)         -> { raw, succeeded, status, tranId }
//   constructWebhookEvent(rawBody, sig) -> verified event
//   currency()                          -> string
//   toMinorUnits(amount)                -> integer
//
// Selection is env-driven (PAYMENT_PROVIDER), and falls back to the mock
// provider whenever the requested one has no credentials, so a missing key
// degrades into a working demo instead of a crash on startup.
const stripeGateway = require("./stripeGateway");
const mockGateway = require("./mockGateway");

const PROVIDERS = {
  stripe: stripeGateway,
  mock: mockGateway,
};

function requestedProviderName() {
  return (process.env.PAYMENT_PROVIDER || "stripe").toLowerCase();
}

// The provider actually in use once credentials are taken into account.
function activeGateway() {
  const requested = requestedProviderName();
  const provider = PROVIDERS[requested];

  if (!provider) {
    console.warn(
      `PAYMENT_PROVIDER="${requested}" is not a known gateway ` +
        `(known: ${Object.keys(PROVIDERS).join(", ")}). Falling back to mock.`
    );
    return mockGateway;
  }

  if (!provider.isConfigured()) {
    return mockGateway;
  }

  return provider;
}

function isMockMode() {
  return activeGateway().name === "mock";
}

// Surfaced to the frontend so the portal can render the right payment UI
// (Stripe Elements vs the mock simulator) without hardcoding a provider.
function publicConfig() {
  const gateway = activeGateway();
  return {
    provider: gateway.name,
    mock: gateway.name === "mock",
    currency: gateway.currency(),
    publishableKey: gateway.name === "stripe" ? process.env.STRIPE_PUBLISHABLE_KEY || null : null,
  };
}

module.exports = { activeGateway, isMockMode, publicConfig, PROVIDERS };
