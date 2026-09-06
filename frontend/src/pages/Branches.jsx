import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { branchAPI } from "../api/resources";

const emptyForm = { branchName: "", address: "", contactNumber: "" };

export default function Branches() {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    branchAPI
      .list()
      .then(setBranches)
      .catch((err) => setError(err.response?.data?.message || "Could not load branches."))
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
      await branchAPI.create(form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create branch.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this branch?")) return;
    try {
      await branchAPI.remove(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete branch.");
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Branches</h1>
          <p>Every physical branch location MFNet operates from.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {user?.role === "admin" && (
        <form className="inline-card" onSubmit={handleSubmit}>
          <h2>Add a branch</h2>
          <div className="field-row-3">
            <div className="form-field">
              <label>Branch name</label>
              <input name="branchName" value={form.branchName} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Address</label>
              <input name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>Contact number</label>
              <input name="contactNumber" value={form.contactNumber} onChange={handleChange} />
            </div>
          </div>
          <div className="inline-card-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Adding…" : "Add branch"}
            </button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : branches.length === 0 ? (
          <div className="table-empty">No branches yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Contact</th>
                {user?.role === "admin" && <th></th>}
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>{b.branchName}</td>
                  <td>{b.address || "—"}</td>
                  <td>{b.contactNumber || "—"}</td>
                  {user?.role === "admin" && (
                    <td className="text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(b.id)}>
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
