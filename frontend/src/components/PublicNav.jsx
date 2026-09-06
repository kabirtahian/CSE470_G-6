import React from "react";
import { Link } from "react-router-dom";

export default function PublicNav() {
  return (
    <header className="public-nav">
      <div className="public-nav-inner">
        <Link to="/" className="brand-mark">
          <span className="brand-seal" aria-hidden="true">MF</span>
          MFNet <span>Foundation</span>
        </Link>
        <nav className="public-nav-links">
          <Link to="/login">Staff login</Link>
          <Link to="/portal/register">Set up portal access</Link>
          <Link to="/portal/login" className="btn btn-accent btn-sm">
            Borrower login
          </Link>
        </nav>
      </div>
    </header>
  );
}
