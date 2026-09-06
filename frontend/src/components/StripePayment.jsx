import React, { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { paymentAPI } from "../api/portalResources";

// Stripe Elements payment panel.
//
// The publishable key is not baked into this bundle. It arrives from the
// backend alongside the PaymentIntent's clientSecret, so rotating keys or
// switching Stripe accounts is a backend .env change and the frontend needs
// no rebuild.
//
// Success is never decided here. When Elements reports the card was
// accepted, the component calls /confirm, and the *backend* re-reads the
// PaymentIntent from Stripe before crediting anything. A tampered client
// cannot talk its way into a paid installment.

// loadStripe must not be called on every render. Keys are cached so a
// second payment in the same session reuses the same Stripe instance.
const stripeCache = new Map();
function getStripe(publishableKey) {
  if (!stripeCache.has(publishableKey)) {
    stripeCache.set(publishableKey, loadStripe(publishableKey));
  }
  return stripeCache.get(publishableKey);
}

function CheckoutForm({ tranId, amount, currency, onDone, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError("");

    // redirect: "if_required" keeps the borrower on the page for card
    // payments, while still supporting methods that must redirect.
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/portal/payments/result?tran_id=${encodeURIComponent(tranId)}`,
      },
    });

    if (stripeError) {
      setError(stripeError.message || "That payment did not go through.");
      setBusy(false);
      return;
    }

    // Card accepted by Stripe. Now have the server verify it independently
    // before anything is credited.
    try {
      const result = await paymentAPI.confirm(tranId);
      if (result.payment && result.payment.status === "valid") {
        onDone(result.payment);
      } else {
        setError(
          result.message ||
            "Your card was accepted but the payment is not confirmed yet. Check My Loans in a moment."
        );
        setBusy(false);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "The payment went through but we could not confirm it. Please check My Loans before you pay again."
      );
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="pay-secure">Kept safe by Stripe. MFNet never sees your card number.</div>

      <div className="pay-testcard">
        Test mode. Use card <code>4242 4242 4242 4242</code>, any future date, any CVC, any postcode.
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="pay-element">
        <PaymentElement onReady={() => setReady(true)} />
      </div>

      <div className="row">
        <button className="btn btn-primary" onClick={handlePay} disabled={!stripe || !ready || busy}>
          {busy ? "Please wait…" : `Pay ${currency.toUpperCase()} ${Number(amount).toLocaleString()}`}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function StripePayment({ session, onDone, onCancel }) {
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    if (session?.publishableKey) {
      setStripePromise(getStripe(session.publishableKey));
    }
  }, [session?.publishableKey]);

  const options = useMemo(
    () => ({
      clientSecret: session?.clientSecret,
      appearance: {
        theme: "flat",
        variables: {
          colorPrimary: "#1e3a8a",
          colorBackground: "#ffffff",
          colorText: "#14161f",
          colorDanger: "#8a271f",
          fontFamily: "Inter, -apple-system, sans-serif",
          borderRadius: "7px",
          spacingUnit: "4px",
        },
      },
    }),
    [session?.clientSecret]
  );

  if (!session?.clientSecret) return null;

  if (!session.publishableKey) {
    return (
      <div className="form-error">
        Stripe is on, but no publishable key came back. Add STRIPE_PUBLISHABLE_KEY
        to the backend .env file and restart the server.
      </div>
    );
  }

  if (!stripePromise) {
    return <p className="muted">Loading the payment form…</p>;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm
        tranId={session.tranId}
        amount={session.amount}
        currency={session.currency || "usd"}
        onDone={onDone}
        onCancel={onCancel}
      />
    </Elements>
  );
}
