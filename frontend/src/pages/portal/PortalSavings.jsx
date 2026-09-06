import React, { useEffect, useState } from "react";
import PortalLayout from "../../components/PortalLayout";
import StripePayment from "../../components/StripePayment";
import { portalAPI, paymentAPI } from "../../api/portalResources";

export default function PortalSavings() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [amount, setAmount] = useState("");
  const [opening, setOpening] = useState(false);
  const [paying, setPaying] = useState(false);
  const [session, setSession] = useState(null);

  function load() {
    setLoading(true);
    portalAPI
      .getSavingsAccount()
      .then(setAccount)
      .catch((err) => setError(err.response?.data?.message || "Could not load your savings account."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleOpen() {
    setOpening(true);
    setError("");
    try {
      await portalAPI.openSavingsAccount();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not open a savings account.");
    } finally {
      setOpening(false);
    }
  }

  async function handleDeposit() {
    if (!amount || Number(amount) <= 0) {
      setError("Please put in an amount to add.");
      return;
    }
    setPaying(true);
    setError("");
    setNotice("");
    try {
      const result = await paymentAPI.initiate({
        purpose: "savings_deposit",
        savingsAccountId: account.id,
        amount,
      });

      if (result.mock) {
        window.location.href = result.redirectUrl;
        return;
      }

      setSession({ ...result, amount });
    } catch (err) {
      setError(err.response?.data?.message || "Could not start payment.");
    } finally {
      setPaying(false);
    }
  }

  function handlePaid() {
    setSession(null);
    setAmount("");
    setNotice("Money added. Your balance is updated.");
    load();
  }

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <h1>My Savings</h1>
          <p>Put money aside alongside your loan.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success">{notice}</div>}

      {loading ? (
        <div className="table-empty">Loading…</div>
      ) : !account ? (
        <div className="inline-card" style={{ maxWidth: 520 }}>
          <h2>Open a savings account</h2>
          <p className="muted">
            You do not have a savings account yet. Opening one takes a moment. After that you can add
            any amount, any time.
          </p>
          <button className="btn btn-primary" onClick={handleOpen} disabled={opening}>
            {opening ? "Please wait…" : "Open a savings account"}
          </button>
        </div>
      ) : (
        <>
          <div className="dashboard-grid" style={{ maxWidth: 620 }}>
            <div className="metric-card">
              <div className="metric-label">Your balance</div>
              <div className="metric-value">৳{Number(account.balance).toLocaleString()}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Account number</div>
              <div className="metric-value mono" style={{ fontSize: "1.1rem" }}>
                {account.accountNumber || `SAV-${account.id}`}
              </div>
            </div>
          </div>

          {!session ? (
            <div className="pay-panel" style={{ maxWidth: 620 }}>
              <div className="pay-panel-head">
                <h3>Add money</h3>
              </div>
              <p className="muted" style={{ fontSize: "0.88rem" }}>
                The money is added as soon as the bank confirms your payment.
              </p>
              <div className="row">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-label="Deposit amount"
                />
                <button className="btn btn-primary btn-sm" onClick={handleDeposit} disabled={paying}>
                  {paying ? "Please wait…" : "Add money"}
                </button>
              </div>
            </div>
          ) : (
            <div className="pay-panel" style={{ maxWidth: 620 }}>
              <div className="pay-panel-head">
                <h3>Pay by card</h3>
                <span className="pay-amount">
                  {(session.currency || "usd").toUpperCase()} {Number(session.amount).toLocaleString()}
                </span>
              </div>
              <StripePayment session={session} onDone={handlePaid} onCancel={() => setSession(null)} />
            </div>
          )}
        </>
      )}
    </PortalLayout>
  );
}
