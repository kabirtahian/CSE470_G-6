import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { reportAPI, adminAPI } from "../api/resources";

function formatCurrency(n) {
  return `৳${Number(n || 0).toLocaleString()}`;
}

export default function Reports() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  function load() {
    reportAPI
      .summary()
      .then(setSummary)
      .catch((err) => setError(err.response?.data?.message || "Could not load report summary."));
  }

  useEffect(load, []);

  async function handleRunOverdueCheck() {
    setChecking(true);
    setCheckResult(null);
    setError("");
    try {
      const result = await adminAPI.runOverdueCheck();
      setCheckResult(result.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not run overdue check.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p>Portfolio health across all branches.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {checkResult && <div className="form-error" style={{ background: "#e4f2e6", color: "#22693a" }}>{checkResult}</div>}

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
          <div className="metric-label">Total outstanding</div>
          <div className="metric-value">{summary ? formatCurrency(summary.totalOutstanding) : "—"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total overdue</div>
          <div className="metric-value">{summary ? formatCurrency(summary.totalOverdue) : "—"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Portfolio at risk</div>
          <div className="metric-value">{summary ? `${(summary.portfolioAtRisk * 100).toFixed(1)}%` : "—"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Disbursed this month</div>
          <div className="metric-value">{summary ? formatCurrency(summary.totalDisbursedThisMonth) : "—"}</div>
        </div>
      </div>

      {user?.role === "admin" && (
        <div className="inline-card">
          <h2>Overdue / default detection</h2>
          <p className="muted">
            Marks any pending installment past its due date as overdue and notifies the relevant loan officer.
            Run on demand for this course project (a real cron job is stretch scope).
          </p>
          <button className="btn btn-primary" disabled={checking} onClick={handleRunOverdueCheck}>
            {checking ? "Running…" : "Run overdue check"}
          </button>
        </div>
      )}
    </AppLayout>
  );
}
