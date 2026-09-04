import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Assistant from "./Assistant";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/branches", label: "Branches" },
  { to: "/members", label: "Members" },
  { to: "/groups", label: "Groups" },
  { to: "/loan-products", label: "Loan Products" },
  { to: "/loan-applications", label: "Loan Applications" },
  { to: "/loans", label: "Loans" },
  { to: "/savings", label: "Savings" },
  { to: "/expenses", label: "Expenses" },
  { to: "/payments", label: "Payments", roles: ["admin", "branch_manager"] },
  { to: "/field-officers", label: "Field Officers" },
  { to: "/meetings", label: "Meetings" },
  { to: "/notifications", label: "Notifications" },
  { to: "/donors", label: "Donors", roles: ["admin"] },
  { to: "/reports", label: "Reports" },
  { to: "/audit-logs", label: "Audit Log", roles: ["admin"] },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const links = NAV_LINKS.filter((link) => !link.roles || link.roles.includes(user?.role));

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link to="/dashboard" className="brand-mark brand-mark-light">
            <span className="brand-seal" aria-hidden="true">MF</span>
            MFNet <span>Staff</span>
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
            {links.map((link) => (
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
              {user?.fullName} <em>{user?.role?.replace("_", " ")}</em>
            </span>
            {/* btn-ghost-light, not btn-ghost: a plain ghost button here is
                dark ink on the dark topbar, which is what made "Log out"
                invisible in the previous build. */}
            <button className="btn btn-ghost btn-ghost-light btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="console-band">
        <div className="console-band-inner">
          <span className="dot" aria-hidden="true" />
          Staff and admin area
        </div>
      </div>

      <main className="app-main">{children}</main>
      <Assistant audience="staff" />
    </div>
  );
}
