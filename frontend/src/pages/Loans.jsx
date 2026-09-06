import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { loanAPI } from "../api/resources";

function StatusBadge({ status }) {
  const cls = status === "active" ? "badge-pending" : status === "closed" ? "badge-verified" : "badge-rejected";
  return <span className={`badge ${cls}`}>{status}</span>;
}

function ScheduleStatusBadge({ status }) {
  const cls = status === "paid" ? "badge-verified" : status === "overdue" ? "badge-rejected" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [amountByLoan, setAmountByLoan] = useState({});
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    loanAPI
      .list()
      .then(setLoans)
      .catch((err) => setError(err.response?.data?.message || "Could not load loans."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleRepayment(id) {
    const amount = amountByLoan[id];
    if (!amount || Number(amount) <= 0) return;
    setBusyId(id);
    setError("");
    try {
      await loanAPI.recordRepayment(id, amount);
      setAmountByLoan({ ...amountByLoan, [id]: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not record repayment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Loans</h1>
          <p>Disbursed loans, repayment schedules, and repayments.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="table-empty">Loading…</div>
      ) : loans.length === 0 ? (
        <div className="table-empty">No loans have been disbursed yet — approve and disburse an application from Loan Applications first.</div>
      ) : (
        loans.map((loan) => {
          const isOpen = openId === loan.id;
          const member = loan.loanApplication?.member;
          return (
            <div className="group-card" key={loan.id}>
              <button className="group-card-header" onClick={() => setOpenId(isOpen ? null : loan.id)}>
                <div>
                  <div className="title">
                    {member?.fullName} — ৳{Number(loan.principal).toLocaleString()} <StatusBadge status={loan.status} />
                  </div>
                  <div className="meta">
                    Outstanding ৳{Number(loan.outstandingBalance).toLocaleString()} · {loan.interestRate}% ·{" "}
                    {loan.tenureMonths} months · Disbursed {loan.disbursedDate}
                  </div>
                </div>
                <span className={`chevron ${isOpen ? "open" : ""}`}>▶</span>
              </button>
              {isOpen && (
                <div className="group-card-body">
                  <h3 style={{ fontSize: "0.95rem", marginTop: 16 }}>Repayment schedule</h3>
                  <table className="data-table data-table-compact">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Due date</th>
                        <th>Amount due</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(loan.repaymentSchedules || [])
                        .slice()
                        .sort((a, b) => a.installmentNo - b.installmentNo)
                        .map((s) => (
                          <tr key={s.id}>
                            <td>{s.installmentNo}</td>
                            <td>{s.dueDate}</td>
                            <td>৳{Number(s.amountDue).toLocaleString()}</td>
                            <td>
                              <ScheduleStatusBadge status={s.status} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {loan.status !== "closed" && (
                    <div className="row mt-24">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Repayment amount (৳)"
                        value={amountByLoan[loan.id] || ""}
                        onChange={(e) => setAmountByLoan({ ...amountByLoan, [loan.id]: e.target.value })}
                      />
                      <button className="btn btn-primary btn-sm" disabled={busyId === loan.id} onClick={() => handleRepayment(loan.id)}>
                        {busyId === loan.id ? "Recording…" : "Record repayment"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </AppLayout>
  );
}
