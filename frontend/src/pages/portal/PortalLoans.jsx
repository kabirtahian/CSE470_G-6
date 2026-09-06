import React, { useEffect, useState } from "react";
import PortalLayout from "../../components/PortalLayout";
import StripePayment from "../../components/StripePayment";
import { portalAPI, paymentAPI } from "../../api/portalResources";

function ScheduleStatusBadge({ status }) {
  const cls = status === "paid" ? "badge-verified" : status === "overdue" ? "badge-rejected" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

function nextInstallment(loan) {
  return (loan.repaymentSchedules || [])
    .filter((s) => s.status !== "paid")
    .sort((a, b) => a.installmentNo - b.installmentNo)[0];
}

export default function PortalLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openId, setOpenId] = useState(null);
  const [amountByLoan, setAmountByLoan] = useState({});
  const [busyId, setBusyId] = useState(null);
  // The live Stripe session, if a payment is currently being taken.
  const [session, setSession] = useState(null);

  function load() {
    setLoading(true);
    portalAPI
      .listLoans()
      .then(setLoans)
      .catch((err) => setError(err.response?.data?.message || "Could not load your loans."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handlePay(loan) {
    const next = nextInstallment(loan);
    const amount = amountByLoan[loan.id] || (next ? next.amountDue : "");
    if (!amount || Number(amount) <= 0) {
      setError("Please put in an amount to pay.");
      return;
    }

    setBusyId(loan.id);
    setError("");
    setNotice("");

    try {
      const result = await paymentAPI.initiate({
        purpose: "loan_repayment",
        loanId: loan.id,
        amount,
      });

      // Mock mode: no gateway configured, so use the built-in simulator.
      if (result.mock) {
        window.location.href = result.redirectUrl;
        return;
      }

      setSession({ ...result, amount, loanId: loan.id });
    } catch (err) {
      setError(err.response?.data?.message || "Could not start payment.");
    } finally {
      setBusyId(null);
    }
  }

  function handlePaid() {
    setSession(null);
    setNotice("Payment received. Your balance and dates are updated.");
    load();
  }

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <h1>My Loans</h1>
          <p>What you owe, when it is due, and what you have paid.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success">{notice}</div>}

      {loading ? (
        <div className="table-empty">Loading…</div>
      ) : loans.length === 0 ? (
        <div className="table-empty">
          You have no loans yet. Once a loan is approved and given out, it will show here.
        </div>
      ) : (
        loans.map((loan) => {
          const isOpen = openId === loan.id;
          const next = nextInstallment(loan);
          const payingThis = session && session.loanId === loan.id;

          return (
            <div className="group-card" key={loan.id}>
              <button className="group-card-header" onClick={() => setOpenId(isOpen ? null : loan.id)}>
                <div>
                  <div className="title">
                    <span>
                      ৳<span className="amount">{Number(loan.principal).toLocaleString()}</span> loan
                    </span>
                    <span className={`badge ${loan.status === "closed" ? "badge-verified" : "badge-info"}`}>
                      {loan.status}
                    </span>
                  </div>
                  <div className="meta">
                    Outstanding ৳{Number(loan.outstandingBalance).toLocaleString()} · {loan.interestRate}% ·
                    Disbursed {loan.disbursedDate}
                  </div>
                </div>
                <span className={`chevron ${isOpen ? "open" : ""}`}>▶</span>
              </button>

              {isOpen && (
                <div className="group-card-body">
                  <table className="data-table data-table-compact" style={{ marginTop: 16 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Due date</th>
                        <th>Amount</th>
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
                            <td className="amount">৳{Number(s.amountDue).toLocaleString()}</td>
                            <td>
                              <ScheduleStatusBadge status={s.status} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {loan.status !== "closed" && !payingThis && (
                    <div className="pay-panel">
                      <div className="pay-panel-head">
                        <h3>Pay now</h3>
                        {next && <span className="pay-amount">৳{Number(next.amountDue).toLocaleString()}</span>}
                      </div>
                      <p className="muted" style={{ fontSize: "0.88rem" }}>
                        {next
                          ? `Payment ${next.installmentNo} is due on ${next.dueDate}. You can pay a different amount if you want to pay early.`
                          : "All payments are done. You can still pay towards the balance."}
                      </p>
                      <div className="row">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={next ? String(next.amountDue) : "Amount"}
                          value={amountByLoan[loan.id] || ""}
                          onChange={(e) => setAmountByLoan({ ...amountByLoan, [loan.id]: e.target.value })}
                          aria-label="Payment amount"
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={busyId === loan.id}
                          onClick={() => handlePay(loan)}
                        >
                          {busyId === loan.id ? "Please wait…" : "Pay this instalment"}
                        </button>
                      </div>
                    </div>
                  )}

                  {payingThis && (
                    <div className="pay-panel">
                      <div className="pay-panel-head">
                        <h3>Pay by card</h3>
                        <span className="pay-amount">
                          {(session.currency || "usd").toUpperCase()} {Number(session.amount).toLocaleString()}
                        </span>
                      </div>
                      <StripePayment session={session} onDone={handlePaid} onCancel={() => setSession(null)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </PortalLayout>
  );
}
