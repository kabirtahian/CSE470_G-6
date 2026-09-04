import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalLayout from "../../components/PortalLayout";
import { portalAPI } from "../../api/portalResources";

const emptyForm = { loanProductId: "", requestedAmount: "", purpose: "" };

export default function PortalApplyLoan() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    portalAPI
      .listLoanProducts()
      .then(setProducts)
      .catch((err) => setError(err.response?.data?.message || "Could not load loan products."));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await portalAPI.applyForLoan(form);
      navigate("/portal/loan-applications");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedProduct = products.find((p) => String(p.id) === String(form.loanProductId));

  return (
    <PortalLayout>
      <div className="page-header">
        <div>
          <h1>Apply for a Loan</h1>
          <p>Pick a loan type and tell us how much you need.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form className="inline-card" onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <div className="form-field">
          <label>Loan type</label>
          <select name="loanProductId" value={form.loanProductId} onChange={handleChange} required>
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.productName} — up to ৳{Number(p.maxAmount).toLocaleString()}, {p.interestRate}% p.a., {p.tenureMonths} mo
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>How much do you need? (৳)</label>
          <input
            type="number"
            step="0.01"
            name="requestedAmount"
            value={form.requestedAmount}
            onChange={handleChange}
            max={selectedProduct?.maxAmount}
            required
          />
          {selectedProduct && (
            <span className="muted">Maximum for this product: ৳{Number(selectedProduct.maxAmount).toLocaleString()}</span>
          )}
        </div>
        <div className="form-field">
          <label>What is it for?</label>
          <input name="purpose" value={form.purpose} onChange={handleChange} placeholder="For example: seeds for the next crop" />
        </div>
        <div className="inline-card-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        </div>
      </form>
    </PortalLayout>
  );
}
