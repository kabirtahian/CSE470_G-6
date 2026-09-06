import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { donorAPI, branchAPI } from "../api/resources";

const emptyForm = { donorName: "", contactInfo: "" };
const emptyContribution = { amount: "", branchId: "" };

export default function Donors() {
  const [donors, setDonors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [contributionForm, setContributionForm] = useState({});

  function load() {
    setLoading(true);
    Promise.all([donorAPI.list(), branchAPI.list()])
      .then(([d, b]) => {
        setDonors(d);
        setBranches(b);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load donors."))
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
      await donorAPI.create(form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create donor.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddContribution(id) {
    const data = contributionForm[id];
    if (!data?.amount) return;
    try {
      await donorAPI.addContribution(id, data);
      setContributionForm({ ...contributionForm, [id]: emptyContribution });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not record contribution.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this donor?")) return;
    try {
      await donorAPI.remove(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete donor.");
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Donors</h1>
          <p>Funding sources and their contributions to MFNet branches.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form className="inline-card" onSubmit={handleSubmit}>
        <h2>Add a donor</h2>
        <div className="field-row-2">
          <div className="form-field">
            <label>Donor name</label>
            <input name="donorName" value={form.donorName} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>Contact info</label>
            <input name="contactInfo" value={form.contactInfo} onChange={handleChange} />
          </div>
        </div>
        <div className="inline-card-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Adding…" : "Add donor"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="table-empty">Loading…</div>
      ) : donors.length === 0 ? (
        <div className="table-empty">No donors yet.</div>
      ) : (
        donors.map((d) => {
          const isOpen = openId === d.id;
          const total = (d.contributions || []).reduce((sum, c) => sum + Number(c.amount), 0);
          return (
            <div className="group-card" key={d.id}>
              <button className="group-card-header" onClick={() => setOpenId(isOpen ? null : d.id)}>
                <div>
                  <div className="title">{d.donorName}</div>
                  <div className="meta">
                    {d.contactInfo || "No contact info"} · Total contributed ৳{total.toLocaleString()}
                  </div>
                </div>
                <span className={`chevron ${isOpen ? "open" : ""}`}>▶</span>
              </button>
              {isOpen && (
                <div className="group-card-body">
                  <h3 style={{ fontSize: "0.95rem", marginTop: 16 }}>Contributions</h3>
                  <table className="data-table data-table-compact">
                    <thead>
                      <tr>
                        <th>Amount</th>
                        <th>Branch</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(d.contributions || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="muted">
                            No contributions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        d.contributions.map((c) => (
                          <tr key={c.id}>
                            <td>৳{Number(c.amount).toLocaleString()}</td>
                            <td>{c.branch?.branchName || "—"}</td>
                            <td>{c.contributionDate}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="row" style={{ marginTop: 12 }}>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={contributionForm[d.id]?.amount || ""}
                      onChange={(e) =>
                        setContributionForm({ ...contributionForm, [d.id]: { ...contributionForm[d.id], amount: e.target.value } })
                      }
                    />
                    <select
                      value={contributionForm[d.id]?.branchId || ""}
                      onChange={(e) =>
                        setContributionForm({ ...contributionForm, [d.id]: { ...contributionForm[d.id], branchId: e.target.value } })
                      }
                    >
                      <option value="">Branch (optional)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branchName}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleAddContribution(d.id)}>
                      Record contribution
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(d.id)}>
                      Delete donor
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
