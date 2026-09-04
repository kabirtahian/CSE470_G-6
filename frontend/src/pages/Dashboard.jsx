import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { reportAPI } from "../api/resources";

const QUICK_LINKS = [
  { to: "/branches", title: "Branches", desc: "Manage branch locations and contact details." },
  { to: "/members", title: "Members", desc: "Client registration, profiles, and KYC status." },
  { to: "/groups", title: "Groups", desc: "Borrower groups and their loan officers." },
  { to: "/loan-products", title: "Loan Products", desc: "Configure interest rates, amounts, and tenure." },
  { to: "/loan-applications", title: "Loan Applications", desc: "Track applications through the approval workflow." },
  { to: "/loans", title: "Loans", desc: "Disbursed loans, repayment schedules, and repayments." },
  { to: "/savings", title: "Savings", desc: "Member savings accounts, deposits, and withdrawals." },
  { to: "/expenses", title: "Expenses", desc: "Branch operating expenses." },
  { to: "/field-officers", title: "Field Officers", desc: "Loan officers and the groups they manage." },
  { to: "/meetings", title: "Meetings", desc: "Group meeting and collection scheduling." },
  { to: "/notifications", title: "Notifications", desc: "In-app alerts, including overdue installments." },
  { to: "/reports", title: "Reports", desc: "Portfolio-at-risk and disbursement analytics." },
];

function formatCurrency(n) {
  return `৳${Number(n || 0).toLocaleString()}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    reportAPI
      .summary()
      .then(setSummary)
      .catch((err) => setError(err.response?.data?.message || "Could not load report summary."));
  }, []);

  let links = QUICK_LINKS;
  if (user?.role === "admin" || user?.role === "branch_manager") {
    links = [...links, { to: "/payments", title: "Payments", desc: "Self-service gateway payments from borrowers." }];
  }
  if (user?.role === "admin") {
    links = [
      ...links,
      { to: "/donors", title: "Donors", desc: "Funding sources and contributions." },
      { to: "/audit-logs", title: "Audit Log", desc: "Every mutating action across the system." },
    ];
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.fullName?.split(" ")[0]}</h1>
          <p>Here's what's happening across MFNet today.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="dashboard-grid">
        <div className="metric-card">
          <div className="metric-label">Active loans</div>
          <div className="metric-value">{summary ? summary.totalActiveLoans : "—"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total members</div>
          <div className="metric-value">{summary ? summary.totalMembers : "—"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Disbursed this month</div>
          <div className="metric-value">{summary ? formatCurrency(summary.totalDisbursedThisMonth) : "—"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Portfolio at risk</div>
          <div className="metric-value">
            {summary ? `${(summary.portfolioAtRisk * 100).toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.2rem", marginBottom: 16 }}>Quick links</h2>
      <div className="quicklink-grid">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="quicklink-card">
            <h3>{link.title}</h3>
            <p>{link.desc}</p>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
