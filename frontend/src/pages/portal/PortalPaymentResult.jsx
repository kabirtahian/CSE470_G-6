import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import PortalLayout from "../../components/PortalLayout";
import { paymentAPI } from "../../api/portalResources";

// Landing point after a payment. Two ways in:
//   - Stripe redirected here for a payment method that requires a redirect.
//   - The mock simulator finished.
//
// Either way this page asks the backend to re-verify with the provider
// before it reports anything as paid.
export default function PortalPaymentResult() {
  const [searchParams] = useSearchParams();
  const tranId = searchParams.get("tran_id");
  const redirectStatus = searchParams.get("status");
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!tranId) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    async function settle() {
      try {
        // Ask the server to reconcile with the gateway first.
        const confirmed = await paymentAPI.confirm(tranId);
        if (!cancelled && confirmed.payment) {
          setPayment(confirmed.payment);
          setChecking(false);
          return;
        }
      } catch (err) {
        // Confirm can legitimately fail (already settled, cancelled, or
        // never started with a gateway) - fall back to just reading it.
      }

      try {
        const current = await paymentAPI.get(tranId);
        if (!cancelled) setPayment(current);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || "Could not load payment status.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    settle();
    return () => {
      cancelled = true;
    };
  }, [tranId]);

  const status = payment?.status || redirectStatus;
  const isOk = status === "valid";
  const isBad = status === "failed" || status === "fail" || status === "cancelled" || status === "cancel";

  let heading = "Payment not confirmed yet";
  if (checking) heading = "Checking your payment";
  else if (isOk) heading = "Payment done";
  else if (status === "failed" || status === "fail") heading = "Payment did not go through";
  else if (status === "cancelled" || status === "cancel") heading = "Payment cancelled";

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <h1>{heading}</h1>
          <p>
            Reference: <span className="mono">{tranId || "—"}</span>
          </p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className={`result-panel ${isOk ? "result-ok" : isBad ? "result-bad" : "result-wait"}`}>
        {checking && <p>Checking with the payment service…</p>}
        {!checking && isOk && (
          <p>
            Your payment is confirmed and added to your account. Your balance and dates are already
            up to date.
          </p>
        )}
        {!checking && status === "initiated" && (
          <p>
            This payment is not confirmed yet, so nothing has been added. Refresh in a moment, or
            check My Loans and My Savings.
          </p>
        )}
        {!checking && (status === "failed" || status === "fail") && (
          <p>This payment did not go through. You were not charged. You can try again.</p>
        )}
        {!checking && (status === "cancelled" || status === "cancel") && (
          <p>You cancelled this payment. Nothing was charged.</p>
        )}

        <div className="row mt-24">
          <Link to="/portal/loans" className="btn btn-ghost btn-sm">
            My loans
          </Link>
          <Link to="/portal/savings" className="btn btn-ghost btn-sm">
            My savings
          </Link>
          <Link to="/portal/dashboard" className="btn btn-ghost btn-sm">
            Dashboard
          </Link>
        </div>
      </div>
    </PortalLayout>
  );
}
