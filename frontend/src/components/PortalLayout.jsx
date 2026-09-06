import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../context/PortalAuthContext";
import Assistant from "./Assistant";

const NAV_LINKS = [
  { to: "/portal/dashboard", label: "Dashboard" },
  { to: "/portal/apply", label: "Apply for a Loan" },
  { to: "/portal/loan-applications", label: "My Applications" },
  { to: "/portal/loans", label: "My Loans" },
  { to: "/portal/savings", label: "My Savings" },
];

export default function PortalLayout({ children }) {
  const { member, logout } = usePortalAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/portal/login");
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link to="/portal/dashboard" className="brand-mark brand-mark-light">
            <span className="brand-seal" aria-hidden="true">MF</span>
            MFNet <span>Borrower Portal</span>
          </Link>
          <button
            className="nav-toggle"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
          <nav className={`app-nav ${menuOpen ? "app-nav-open" : ""}`}>
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="app-topbar-user">
            <span className="user-chip">
              {member?.fullName} <em>{member?.kycStatus} KYC</em>
            </span>
            <button className="btn btn-ghost btn-ghost-light btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="console-band console-band-portal">
        <div className="console-band-inner">
          <span className="dot" aria-hidden="true" />
          Your account · MFNet Foundation
        </div>
      </div>

      <main className="app-main">{children}</main>
      <Assistant audience="member" />
    </div>
  );
}
