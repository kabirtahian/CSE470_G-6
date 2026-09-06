#!/usr/bin/env node
/**
 * Integration pre-flight check.
 *
 * Confirms that the credentials in backend/.env actually work, by making
 * one real call to each configured provider. Run this before a demo:
 *
 *   cd backend && npm run verify
 *
 * It is safe and cheap: the Stripe check creates a test-mode PaymentIntent
 * and immediately cancels it (no charge, no customer), and the AI check
 * sends a single short prompt.
 *
 * This script exists because the environment the project was assembled in
 * could not reach api.stripe.com or generativelanguage.googleapis.com - so
 * the live round-trip is yours to run, and this makes it one command.
 */
require("dotenv").config();

const gateways = require("../src/utils/gateways");
const aiProvider = require("../src/utils/aiProvider");

const ok = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const bad = (m) => console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`);
const info = (m) => console.log(`  \x1b[90m·\x1b[0m     ${m}`);

let failures = 0;

async function checkStripe() {
  console.log("\n== Payment gateway ==");
  const gw = gateways.activeGateway();
  info(`PAYMENT_PROVIDER requested: ${process.env.PAYMENT_PROVIDER || "stripe (default)"}`);
  info(`Gateway actually active:    ${gw.name}`);

  if (gw.name === "mock") {
    info("Running in mock mode - no Stripe credentials configured.");
    info("The app is fully demoable like this. To use real Stripe, set");
    info("STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in backend/.env.");
    return;
  }

  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    bad("STRIPE_PUBLISHABLE_KEY is not set - the card form cannot render.");
    failures += 1;
  } else if (!process.env.STRIPE_PUBLISHABLE_KEY.startsWith("pk_")) {
    bad("STRIPE_PUBLISHABLE_KEY does not look like a publishable key (should start with pk_).");
    failures += 1;
  } else {
    ok("Publishable key present.");
  }

  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
    bad("STRIPE_SECRET_KEY does not look like a secret key (should start with sk_).");
    failures += 1;
  }

  const live = String(process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live_");
  if (live) {
    info("\x1b[33mThis is a LIVE key - real money. Use sk_test_ for coursework.\x1b[0m");
  }

  try {
    const intent = await gw.createIntent({
      payment: {
        tranId: `MFNET-VERIFY-${Date.now()}`,
        memberId: 0,
        purpose: "loan_repayment",
        amount: "100.00",
      },
      member: { fullName: "Integration check", email: null },
      description: "MFNet integration verification (safe to ignore)",
    });

    ok(`Created a test PaymentIntent: ${intent.providerRef}`);

    if (!intent.clientSecret) {
      bad("No clientSecret returned - the card form would not load.");
      failures += 1;
    } else {
      ok("clientSecret returned - Stripe Elements will render.");
    }

    const back = await gw.retrieveIntent(intent.providerRef);
    if (back.raw.amount === 10000) {
      ok(`Amount converted correctly to minor units (${back.raw.amount} ${gw.currency()}).`);
    } else {
      bad(`Unexpected amount in minor units: ${back.raw.amount} (expected 10000).`);
      failures += 1;
    }

    if (back.tranId && back.tranId.startsWith("MFNET-VERIFY-")) {
      ok("tranId round-tripped through Stripe metadata - webhooks will match.");
    } else {
      bad("tranId did not survive the metadata round-trip.");
      failures += 1;
    }

    // Tidy up so the dashboard isn't littered with verification intents.
    const Stripe = require("stripe");
    await new Stripe(process.env.STRIPE_SECRET_KEY).paymentIntents.cancel(intent.providerRef);
    ok("Test PaymentIntent cancelled - nothing left behind, nothing charged.");
  } catch (err) {
    bad(`Stripe call failed: ${err.type || err.name} - ${err.message}`);
    if (err.type === "StripeAuthenticationError") {
      info("That usually means STRIPE_SECRET_KEY is wrong, revoked, or has extra whitespace.");
    }
    if (/Invalid JSON received/.test(err.message)) {
      info("A non-JSON reply usually means a proxy or firewall is intercepting api.stripe.com.");
    }
    failures += 1;
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    info("No STRIPE_WEBHOOK_SECRET set. Not fatal: after a card is accepted the");
    info("portal calls /confirm, which re-verifies with Stripe server-side.");
    info("For webhooks locally: stripe listen --forward-to localhost:5000/api/payments/webhook");
  } else {
    ok("Webhook signing secret present.");
  }
}

async function checkAI() {
  console.log("\n== AI assistant ==");
  info(`AI_PROVIDER: ${aiProvider.providerName()}`);

  if (!aiProvider.isConfigured()) {
    info("No AI_API_KEY set - the assistant will answer from its built-in guide.");
    info("That is a supported mode, not a failure.");
    return;
  }

  info(`Model: ${aiProvider.model()}`);
  const key = process.env.AI_API_KEY;
  if (key.startsWith("AQ.")) {
    info("Key uses Google's newer 'AQ.' format - this app calls the native");
    info("Gemini endpoint, which accepts it. (OpenAI-compatible shims do not.)");
  }

  try {
    const reply = await aiProvider.ask({
      systemPrompt: "You are a test harness. Reply with exactly the word: READY",
      history: [],
      message: "Reply with exactly the word READY and nothing else.",
    });
    ok(`AI provider responded: "${reply.slice(0, 60)}"`);
  } catch (err) {
    const detail = err.response ? JSON.stringify(err.response.data).slice(0, 300) : err.message;
    bad(`AI call failed: ${detail}`);
    info("The assistant will still work - it falls back to the built-in guide.");
    info("Check the key at https://aistudio.google.com/apikey if this persists.");
    failures += 1;
  }
}

(async () => {
  console.log("MFNet integration check");
  console.log("=======================");
  await checkStripe();
  await checkAI();
  console.log(
    failures === 0
      ? "\n\x1b[32mAll configured integrations responded.\x1b[0m\n"
      : `\n\x1b[31m${failures} check(s) failed.\x1b[0m See the notes above.\n`
  );
  process.exit(failures === 0 ? 0 : 1);
})();
