import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { expenseAPI, branchAPI } from "../api/resources";

const emptyForm = { category: "", amount: "", expenseDate: "", description: "", branchId: "" };

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const canManage = user?.role === "admin" || user?.role === "branch_manager";

  function load() {
    setLoading(true);
    Promise.all([expenseAPI.list(), branchAPI.list()])
      .then(([e, b]) => {
        setExpenses(e);
        setBranches(b);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load expenses."))
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
      await expenseAPI.create(form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create expense.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await expenseAPI.remove(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete expense.");
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>Branch operating expenses.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {canManage && (
        <form className="inline-card" onSubmit={handleSubmit}>
          <h2>Log an expense</h2>
          <div className="field-row-3">
            <div className="form-field">
              <label>Category</label>
              <input name="category" value={form.category} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Amount (৳)</label>
              <input type="number" step="0.01" name="amount" value={form.amount} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Date</label>
              <input type="date" name="expenseDate" value={form.expenseDate} onChange={handleChange} />
            </div>
          </div>
          <div className="field-row-3">
            <div className="form-field">
              <label>Branch</label>
              <select name="branchId" value={form.branchId} onChange={handleChange}>
                <option value="">—</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Description</label>
              <input name="description" value={form.description} onChange={handleChange} />
            </div>
          </div>
          <div className="inline-card-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Log expense"}
            </button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="table-empty">No expenses logged yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Branch</th>
                <th>Date</th>
                <th>Description</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.category}</td>
                  <td>৳{Number(e.amount).toLocaleString()}</td>
                  <td>{e.branch?.branchName || "—"}</td>
                  <td>{e.expenseDate}</td>
                  <td>{e.description || "—"}</td>
                  {canManage && (
                    <td className="text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
