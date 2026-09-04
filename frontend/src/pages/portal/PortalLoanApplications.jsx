import React, { useEffect, useState } from "react";
import PortalLayout from "../../components/PortalLayout";
import { portalAPI } from "../../api/portalResources";

function StatusBadge({ status }) {
  const cls = status === "approved" ? "badge-verified" : status === "rejected" ? "badge-rejected" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function PortalLoanApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    portalAPI
      .listApplications()
      .then(setApplications)
      .catch((err) => setError(err.response?.data?.message || "Could not load your applications."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <h1>My Loan Requests</h1>
          <p>See which step each request has reached.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : applications.length === 0 ? (
          <div className="table-empty">You haven't applied for a loan yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Stage</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>{a.loanProduct?.productName}</td>
                  <td>৳{Number(a.requestedAmount).toLocaleString()}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>{a.status === "pending" ? `Awaiting ${a.currentStageLabel}` : "—"}</td>
                  <td>{a.applicationDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
