import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { savingsAPI } from "../api/resources";

export default function Savings() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amounts, setAmounts] = useState({});
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    savingsAPI
      .list()
      .then(setAccounts)
      .catch((err) => setError(err.response?.data?.message || "Could not load savings accounts."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDeposit(id) {
    const amount = amounts[id];
    if (!amount || Number(amount) <= 0) return;
    setBusyId(id);
    setError("");
    try {
      await savingsAPI.deposit(id, amount);
      setAmounts({ ...amounts, [id]: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not record deposit.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleWithdraw(id) {
    const amount = amounts[id];
    if (!amount || Number(amount) <= 0) return;
    setBusyId(id);
    setError("");
    try {
      await savingsAPI.withdraw(id, amount);
      setAmounts({ ...amounts, [id]: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not record withdrawal.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Savings</h1>
          <p>Member savings accounts, deposits, and withdrawals.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <p className="muted" style={{ marginBottom: 16 }}>
        New savings accounts are opened from a member's row on the Members page.
      </p>

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : accounts.length === 0 ? (
          <div className="table-empty">No savings accounts yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Opened</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.member?.fullName}</td>
                  <td>৳{Number(a.balance).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${a.status === "active" ? "badge-verified" : "badge-rejected"}`}>{a.status}</span>
                  </td>
                  <td>{a.openDate}</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      style={{ width: 120 }}
                      value={amounts[a.id] || ""}
                      onChange={(e) => setAmounts({ ...amounts, [a.id]: e.target.value })}
                    />
                  </td>
                  <td className="text-right">
                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost btn-sm" disabled={busyId === a.id} onClick={() => handleDeposit(a.id)}>
                        Deposit
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={busyId === a.id} onClick={() => handleWithdraw(a.id)}>
                        Withdraw
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
