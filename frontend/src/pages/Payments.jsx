import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { gatewayPaymentAPI } from "../api/resources";

function StatusBadge({ status }) {
  const cls = status === "valid" ? "badge-verified" : status === "failed" || status === "cancelled" ? "badge-rejected" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [gateway, setGateway] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    gatewayPaymentAPI
      .list()
      .then((data) => {
        setPayments(data.payments || data);
        setGateway(data.gateway || null);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load payments."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Card Payments</h1>
          <p>Loan payments and savings deposits that borrowers made themselves by card.</p>
        </div>
        {gateway && (
          <span className={`badge ${gateway.mock ? "badge-pending" : "badge-verified"}`}>
            {gateway.mock ? "Mock gateway" : `${gateway.provider} · ${gateway.currency?.toUpperCase()}`}
          </span>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="table-empty">No card payments yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Member</th>
                <th>Purpose</th>
                <th>Gateway</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.tranId}</td>
                  <td>
                    {p.member?.fullName} <span className="muted">({p.member?.nationalId})</span>
                  </td>
                  <td>{p.purpose === "loan_repayment" ? "Loan payment" : "Savings deposit"}</td>
                  <td>
                    <span className="badge badge-neutral">{p.provider || "—"}</span>
                  </td>
                  <td className="amount">৳{Number(p.amount).toLocaleString()}</td>
                  <td>
                    <StatusBadge status={p.status} />
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
