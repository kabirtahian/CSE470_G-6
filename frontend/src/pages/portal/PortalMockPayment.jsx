import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PortalLayout from "../../components/PortalLayout";
import { paymentAPI } from "../../api/portalResources";

export default function PortalMockPayment() {
  const { tranId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    paymentAPI
      .get(tranId)
      .then(setPayment)
      .catch((err) => setError(err.response?.data?.message || "Could not load this payment."));
  }, [tranId]);

  async function handleOutcome(outcome) {
    setBusy(true);
    setError("");
    try {
      await paymentAPI.mockComplete(tranId, outcome);
      navigate(`/portal/payments/result?tran_id=${tranId}&status=${outcome}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not complete this payment.");
      setBusy(false);
    }
  }

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <h1>Test payment</h1>
          <p>No card service is set up, so this page stands in for it. It updates your account the same way a real payment would.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {payment && (
        <div className="inline-card" style={{ maxWidth: 480 }}>
          <h2>৳{Number(payment.amount).toLocaleString()}</h2>
          <p className="muted">
            {payment.purpose === "loan_repayment" ? "Loan repayment" : "Savings deposit"} · Ref {payment.tranId}
          </p>
          <div className="row mt-24">
            <button className="btn btn-primary" disabled={busy} onClick={() => handleOutcome("success")}>
              Simulate successful payment
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => handleOutcome("cancel")}>
              Simulate cancel
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={() => handleOutcome("fail")}>
              Simulate failure
            </button>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
