import React from "react";
import { Link } from "react-router-dom";

export default function AuthLayout({ title, subtitle, children, side }) {
  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <Link to="/" className="brand-mark brand-mark-light">
          <span className="brand-seal" aria-hidden="true">MF</span>
          MFNet <span>Foundation</span>
        </Link>
        <div className="auth-brand-copy">
          <h1>
            Small loans.
            <br />
            <em>Clear records.</em>
          </h1>
          <p>
            {side ||
              `MFNet Foundation gives small loans to people who cannot get one from
               a bank. We work with families, farmers, shop owners, and small
               traders across 12 branches.`}
          </p>
        </div>
        <p className="auth-brand-foot">
          A CSE470 course project · BRAC University
        </p>
      </div>
      <div className="auth-panel">
        <div className="auth-panel-inner">
          <h2>{title}</h2>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
