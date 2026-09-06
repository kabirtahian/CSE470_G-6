import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { memberAPI, branchAPI, groupAPI } from "../api/resources";

const emptyForm = {
  fullName: "",
  nationalId: "",
  address: "",
  phone: "",
  dob: "",
  branchId: "",
  groupId: "",
};

function StatusBadge({ status }) {
  const cls = status === "verified" ? "badge-verified" : status === "rejected" ? "badge-rejected" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function Members() {
  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([memberAPI.list(), branchAPI.list(), groupAPI.list()])
      .then(([m, b, g]) => {
        setMembers(m);
        setBranches(b);
        setGroups(g);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load members."))
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
      await memberAPI.create(form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create member.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleKycChange(id, status) {
    try {
      await memberAPI.updateKyc(id, status);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update KYC status.");
    }
  }

  async function handleUpload(id, file) {
    if (!file) return;
    setUploadingFor(id);
    try {
      const fd = new FormData();
      fd.append("document", file);
      fd.append("docType", "other");
      await memberAPI.uploadDocument(id, fd);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not upload document.");
    } finally {
      setUploadingFor(null);
    }
  }

  async function handleOpenSavings(id) {
    try {
      await memberAPI.openSavingsAccount(id);
      window.location.href = "/savings";
    } catch (err) {
      setError(err.response?.data?.message || "Could not open savings account.");
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1>Members</h1>
          <p>Client registration, profiles, and KYC status.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form className="inline-card" onSubmit={handleSubmit}>
        <h2>Register a member</h2>
        <div className="field-row-3">
          <div className="form-field">
            <label>Full name</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>National ID</label>
            <input name="nationalId" value={form.nationalId} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>
        </div>
        <div className="field-row-3">
          <div className="form-field">
            <label>Address</label>
            <input name="address" value={form.address} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Date of birth</label>
            <input type="date" name="dob" value={form.dob} onChange={handleChange} />
          </div>
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
        </div>
        <div className="field-row-3">
          <div className="form-field">
            <label>Group</label>
            <select name="groupId" value={form.groupId} onChange={handleChange}>
              <option value="">—</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.groupName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="inline-card-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Registering…" : "Register member"}
          </button>
        </div>
      </form>

      <div className="table-wrap">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : members.length === 0 ? (
          <div className="table-empty">No members yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>National ID</th>
                <th>Branch</th>
                <th>Group</th>
                <th>KYC</th>
                <th>Documents</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.fullName}</td>
                  <td>{m.nationalId}</td>
                  <td>{m.branch?.branchName || "—"}</td>
                  <td>{m.group?.groupName || "—"}</td>
                  <td>
                    <div className="row">
                      <StatusBadge status={m.kycStatus} />
                      <select
                        value={m.kycStatus}
                        onChange={(e) => handleKycChange(m.id, e.target.value)}
                        style={{ fontSize: "0.75rem", padding: "2px 4px" }}
                      >
                        <option value="pending">pending</option>
                        <option value="verified">verified</option>
                        <option value="rejected">rejected</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="stack">
                      <span className="muted" style={{ fontSize: "0.8rem" }}>
                        {m.documents?.length || 0} on file
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        style={{ fontSize: "0.75rem" }}
                        disabled={uploadingFor === m.id}
                        onChange={(e) => handleUpload(m.id, e.target.files[0])}
                      />
                    </div>
                  </td>
                  <td className="text-right">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleOpenSavings(m.id)}>
                      Open savings
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
