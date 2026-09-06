import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PortalLayout from "../../components/PortalLayout";
import { usePortalAuth } from "../../context/PortalAuthContext";
import { portalAPI } from "../../api/portalResources";

function StatusBadge({ status }) {
  const cls = status === "verified" ? "badge-verified" : status === "rejected" ? "badge-rejected" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function PortalDashboard() {
  const { member } = usePortalAuth();
  const [applications, setApplications] = useState([]);
  const [loans, setLoans] = useState([]);
  const [savings, setSavings] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([portalAPI.listApplications(), portalAPI.listLoans(), portalAPI.getSavingsAccount().catch(() => null)])
      .then(([a, l, s]) => {
        setApplications(a);
        setLoans(l);
        setSavings(s);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load your dashboard."));
  }, []);

  const activeLoans = loans.filter((l) => l.status === "active");
  const outstanding = activeLoans.reduce((sum, l) => sum + Number(l.outstandingBalance), 0);

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <h1>Welcome, {member?.fullName?.split(" ")[0]}</h1>
          <p>
            ID check: <StatusBadge status={member?.kycStatus} />
          </p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="dashboard-grid">
        <div className="metric-card">
          <div className="metric-label">Open applications</div>
          <div className="metric-value">{applications.filter((a) => a.status === "pending").length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active loans</div>
          <div className="metric-value">{activeLoans.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Outstanding balance</div>
          <div className="metric-value">৳{outstanding.toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Savings balance</div>
          <div className="metric-value">{savings ? `৳${Number(savings.balance).toLocaleString()}` : "No account"}</div>
        </div>
      </div>

      <div className="quicklink-grid">
        <Link to="/portal/apply" className="quicklink-card">
          <h3>Apply for a loan</h3>
          <p>Send a new loan request.</p>
        </Link>
        <Link to="/portal/loan-applications" className="quicklink-card">
          <h3>My applications</h3>
          <p>See where your requests have reached.</p>
        </Link>
        <Link to="/portal/loans" className="quicklink-card">
          <h3>My loans</h3>
          <p>See what you owe and pay by card.</p>
        </Link>
        <Link to="/portal/savings" className="quicklink-card">
          <h3>My savings</h3>
          <p>{savings ? "See your balance and add money." : "Open a savings account."}</p>
        </Link>
      </div>
    </PortalLayout>
  );
}
