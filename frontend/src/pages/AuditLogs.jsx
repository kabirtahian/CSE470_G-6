import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { auditLogAPI } from "../api/resources";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 25;

  function load() {
    setLoading(true);
    auditLogAPI
      .list({ page, pageSize })
      .then((data) => {
        setLogs(data.auditLogs);
        setTotal(data.total);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load audit log."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <p>Every successful mutating action (create, update, delete) across the system.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="table-empty">No audit log entries yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.action}</td>
                  <td>
                    {l.user?.fullName} <span className="muted">({l.user?.role})</span>
                  </td>
                  <td>{new Date(l.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span className="muted">
          Page {page} of {totalPages}
        </span>
        <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </AppLayout>
  );
}
