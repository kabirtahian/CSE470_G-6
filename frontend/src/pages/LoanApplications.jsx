import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { loanApplicationAPI, memberAPI, loanProductAPI } from "../api/resources";

const emptyForm = { memberId: "", loanProductId: "", requestedAmount: "", purpose: "" };
const emptyGuarantor = { fullName: "", relationToApplicant: "", contactNumber: "" };
const emptyCollateral = { description: "", estimatedValue: "" };

function StatusBadge({ status }) {
  const cls = status === "approved" ? "badge-verified" : status === "rejected" ? "badge-rejected" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function LoanApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [members, setMembers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [comments, setComments] = useState({});
  const [guarantorForm, setGuarantorForm] = useState({});
  const [collateralForm, setCollateralForm] = useState({});
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([loanApplicationAPI.list(), memberAPI.list(), loanProductAPI.list()])
      .then(([a, m, p]) => {
        setApplications(a);
        setMembers(m);
        setProducts(p);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load loan applications."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await loanApplicationAPI.create(form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create loan application.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(id, decisionValue) {
    setBusyId(id);
    setError("");
    try {
      await loanApplicationAPI.decide(id, decisionValue, comments[id] || "");
      setComments({ ...comments, [id]: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not record decision.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddGuarantor(id) {
    const data = guarantorForm[id];
    if (!data?.fullName) return;
    try {
      await loanApplicationAPI.addGuarantor(id, data);
      setGuarantorForm({ ...guarantorForm, [id]: emptyGuarantor });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add guarantor.");
    }
  }

  async function handleAddCollateral(id) {
    const data = collateralForm[id];
    if (!data?.description) return;
    try {
      await loanApplicationAPI.addCollateral(id, data);
      setCollateralForm({ ...collateralForm, [id]: emptyCollateral });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add collateral.");
    }
  }

  async function handleDisburse(id) {
    setBusyId(id);
    setError("");
    try {
      await loanApplicationAPI.disburse(id);
      window.location.href = "/loans";
    } catch (err) {
      setError(err.response?.data?.message || "Could not disburse loan.");
      setBusyId(null);
    }
  }

  const canDecideThisStage = (app) =>
    app.status === "pending" && (user?.role === "admin" || user?.role === app.currentStageRole);
  const canDisburse = (app) => app.status === "approved" && !app.loan && (user?.role === "admin" || user?.role === "branch_manager");

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Loan Applications</h1>
          <p>Track applications through the amount-based approval workflow.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form className="inline-card" onSubmit={handleSubmit}>
        <h2>New loan application</h2>
        <div className="field-row-3">
          <div className="form-field">
            <label>Member</label>
            <select name="memberId" value={form.memberId} onChange={handleChange} required>
              <option value="">Select member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.nationalId})
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Loan product</label>
            <select name="loanProductId" value={form.loanProductId} onChange={handleChange} required>
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productName} (max ৳{Number(p.maxAmount).toLocaleString()})
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Requested amount (৳)</label>
            <input type="number" step="0.01" name="requestedAmount" value={form.requestedAmount} onChange={handleChange} required />
          </div>
        </div>
        <div className="form-field">
          <label>Purpose</label>
          <input name="purpose" value={form.purpose} onChange={handleChange} />
        </div>
        <div className="inline-card-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="table-empty">Loading…</div>
      ) : applications.length === 0 ? (
        <div className="table-empty">No loan applications yet.</div>
      ) : (
        applications.map((app) => {
          const isOpen = openId === app.id;
          return (
            <div className="group-card" key={app.id}>
              <button className="group-card-header" onClick={() => setOpenId(isOpen ? null : app.id)}>
                <div>
                  <div className="title">
                    {app.member?.fullName} — ৳{Number(app.requestedAmount).toLocaleString()}{" "}
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="meta">
                    {app.loanProduct?.productName} · {app.purpose || "No purpose given"} ·{" "}
                    {app.status === "pending" ? `Awaiting ${app.currentStageLabel}` : "Decided"}
                  </div>
                </div>
                <span className={`chevron ${isOpen ? "open" : ""}`}>▶</span>
              </button>
              {isOpen && (
                <div className="group-card-body">
                  <p className="muted" style={{ marginTop: 16 }}>
                    Approval chain: {app.requiredStageLabels?.join(" → ")}
                  </p>

                  <h3 style={{ fontSize: "0.95rem" }}>Approval history</h3>
                  {app.approvalSteps?.length ? (
                    <table className="data-table data-table-compact">
                      <thead>
                        <tr>
                          <th>Stage</th>
                          <th>Decision</th>
                          <th>Approver</th>
                          <th>Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {app.approvalSteps.map((s) => (
                          <tr key={s.id}>
                            <td>{s.stage}</td>
                            <td>{s.decision}</td>
                            <td>{s.approver?.fullName}</td>
                            <td>{s.comments || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="muted">No decisions recorded yet.</p>
                  )}

                  {canDecideThisStage(app) && (
                    <div className="row mt-24">
                      <input
                        placeholder="Comments (optional)"
                        value={comments[app.id] || ""}
                        onChange={(e) => setComments({ ...comments, [app.id]: e.target.value })}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={busyId === app.id}
                        onClick={() => handleDecision(app.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={busyId === app.id}
                        onClick={() => handleDecision(app.id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {canDisburse(app) && (
                    <div className="mt-24">
                      <button className="btn btn-accent btn-sm" disabled={busyId === app.id} onClick={() => handleDisburse(app.id)}>
                        {busyId === app.id ? "Disbursing…" : "Disburse loan"}
                      </button>
                    </div>
                  )}
                  {app.loan && (
                    <p className="muted mt-24">
                      Disbursed — outstanding balance ৳{Number(app.loan.outstandingBalance).toLocaleString()}. See the Loans page for the repayment schedule.
                    </p>
                  )}

                  <h3 style={{ fontSize: "0.95rem", marginTop: 24 }}>Guarantors</h3>
                  <table className="data-table data-table-compact">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Relation</th>
                        <th>Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(app.guarantors || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="muted">
                            None added yet.
                          </td>
                        </tr>
                      ) : (
                        app.guarantors.map((g) => (
                          <tr key={g.guarantorId}>
                            <td>{g.fullName}</td>
                            <td>{g.relationToApplicant || "—"}</td>
                            <td>{g.contactNumber || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="row" style={{ marginTop: 8 }}>
                    <input
                      placeholder="Guarantor name"
                      value={guarantorForm[app.id]?.fullName || ""}
                      onChange={(e) =>
                        setGuarantorForm({ ...guarantorForm, [app.id]: { ...guarantorForm[app.id], fullName: e.target.value } })
                      }
                    />
                    <input
                      placeholder="Relation"
                      value={guarantorForm[app.id]?.relationToApplicant || ""}
                      onChange={(e) =>
                        setGuarantorForm({
                          ...guarantorForm,
                          [app.id]: { ...guarantorForm[app.id], relationToApplicant: e.target.value },
                        })
                      }
                    />
                    <input
                      placeholder="Contact number"
                      value={guarantorForm[app.id]?.contactNumber || ""}
                      onChange={(e) =>
                        setGuarantorForm({
                          ...guarantorForm,
                          [app.id]: { ...guarantorForm[app.id], contactNumber: e.target.value },
                        })
                      }
                    />
                    <button className="btn btn-ghost btn-sm" onClick={() => handleAddGuarantor(app.id)}>
                      Add
                    </button>
                  </div>

                  <h3 style={{ fontSize: "0.95rem", marginTop: 24 }}>Collateral</h3>
                  <table className="data-table data-table-compact">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Estimated value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(app.collaterals || []).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="muted">
                            None added yet.
                          </td>
                        </tr>
                      ) : (
                        app.collaterals.map((c) => (
                          <tr key={c.collateralId}>
                            <td>{c.description}</td>
                            <td>{c.estimatedValue ? `৳${Number(c.estimatedValue).toLocaleString()}` : "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="row" style={{ marginTop: 8 }}>
                    <input
                      placeholder="Description"
                      value={collateralForm[app.id]?.description || ""}
                      onChange={(e) =>
                        setCollateralForm({
                          ...collateralForm,
                          [app.id]: { ...collateralForm[app.id], description: e.target.value },
                        })
                      }
                    />
                    <input
                      type="number"
                      placeholder="Estimated value"
                      value={collateralForm[app.id]?.estimatedValue || ""}
                      onChange={(e) =>
                        setCollateralForm({
                          ...collateralForm,
                          [app.id]: { ...collateralForm[app.id], estimatedValue: e.target.value },
                        })
                      }
                    />
                    <button className="btn btn-ghost btn-sm" onClick={() => handleAddCollateral(app.id)}>
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </AppLayout>
  );
}
