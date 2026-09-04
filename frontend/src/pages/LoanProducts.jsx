import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { loanProductAPI } from "../api/resources";

const emptyForm = { productName: "", interestRate: "", maxAmount: "", tenureMonths: "", productType: "group" };

export default function LoanProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    loanProductAPI
      .list()
      .then(setProducts)
      .catch((err) => setError(err.response?.data?.message || "Could not load loan products."))
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
      await loanProductAPI.create(form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create loan product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(product) {
    try {
      await loanProductAPI.update(product.id, { isActive: !product.isActive });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update loan product.");
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Loan Products</h1>
          <p>Interest rates, amounts, and tenure for every loan product offered.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {user?.role === "admin" && (
        <form className="inline-card" onSubmit={handleSubmit}>
          <h2>Add a loan product</h2>
          <div className="field-row-3">
            <div className="form-field">
              <label>Product name</label>
              <input name="productName" value={form.productName} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Interest rate (% p.a.)</label>
              <input type="number" step="0.01" name="interestRate" value={form.interestRate} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Max amount (৳)</label>
              <input type="number" step="0.01" name="maxAmount" value={form.maxAmount} onChange={handleChange} required />
            </div>
          </div>
          <div className="field-row-3">
            <div className="form-field">
              <label>Tenure (months)</label>
              <input type="number" name="tenureMonths" value={form.tenureMonths} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Product type</label>
              <select name="productType" value={form.productType} onChange={handleChange}>
                <option value="group">group</option>
                <option value="individual">individual</option>
              </select>
            </div>
          </div>
          <div className="inline-card-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Adding…" : "Add product"}
            </button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : products.length === 0 ? (
          <div className="table-empty">No loan products yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Interest</th>
                <th>Max amount</th>
                <th>Tenure</th>
                <th>Status</th>
                {user?.role === "admin" && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.productName}</td>
                  <td>{p.productType}</td>
                  <td>{p.interestRate}%</td>
                  <td>৳{Number(p.maxAmount).toLocaleString()}</td>
                  <td>{p.tenureMonths} mo</td>
                  <td>
                    <span className={`badge ${p.isActive ? "badge-verified" : "badge-rejected"}`}>
                      {p.isActive ? "active" : "inactive"}
                    </span>
                  </td>
                  {user?.role === "admin" && (
                    <td className="text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(p)}>
                        {p.isActive ? "Deactivate" : "Activate"}
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
