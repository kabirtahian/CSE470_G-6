import React from "react";
import { Navigate } from "react-router-dom";
import { usePortalAuth } from "../context/PortalAuthContext";

export default function PortalProtectedRoute({ children }) {
  const { member, loading } = usePortalAuth();
  if (loading) return <div className="page-loading">Loading…</div>;
  if (!member) return <Navigate to="/portal/login" replace />;
  return children;
}
