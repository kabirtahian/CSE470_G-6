import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import { usePortalAuth } from "../../context/PortalAuthContext";

export default function PortalLogin() {
  const { login } = usePortalAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nationalId: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.nationalId, form.password);
      navigate("/portal/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Could not log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Borrower log in" subtitle="Use your National ID and the password you made.">
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>National ID</label>
          <input name="nationalId" value={form.nationalId} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label>Password</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 20 }}>
        New here? <Link to="/portal/register">Set up portal access</Link>
      </p>
      <p className="muted" style={{ marginTop: 8 }}>
        MFNet staff member? <Link to="/login">Staff login</Link>
      </p>
    </AuthLayout>
  );
}
