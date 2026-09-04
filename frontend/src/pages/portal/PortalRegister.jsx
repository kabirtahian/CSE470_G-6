import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import { usePortalAuth } from "../../context/PortalAuthContext";

export default function PortalRegister() {
  const { register } = usePortalAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nationalId: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }
    setSubmitting(true);
    try {
      await register(form);
      navigate("/portal/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Could not set up your account. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Set up portal access"
      subtitle="Your branch must add you as a member first. Put in the National ID and phone number they have for you, then pick a password."
    >
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>National ID</label>
          <input name="nationalId" value={form.nationalId} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label>Phone number on file</label>
          <input name="phone" value={form.phone} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label>Choose a password (min 8 characters)</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? "Setting up…" : "Set up portal access"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 20 }}>
        Already set up? <Link to="/portal/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
