import React, { createContext, useContext, useEffect, useState } from "react";
import { portalAuthAPI } from "../api/portalResources";

const PortalAuthContext = createContext(null);

export function PortalAuthProvider({ children }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("mfnet_portal_token");
    if (!token) {
      setLoading(false);
      return;
    }
    portalAuthAPI
      .me()
      .then((m) => setMember(m))
      .catch(() => {
        localStorage.removeItem("mfnet_portal_token");
        localStorage.removeItem("mfnet_portal_member");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(nationalId, password) {
    const data = await portalAuthAPI.login({ nationalId, password });
    localStorage.setItem("mfnet_portal_token", data.token);
    localStorage.setItem("mfnet_portal_member", JSON.stringify(data.member));
    setMember(data.member);
    return data.member;
  }

  async function register(payload) {
    const data = await portalAuthAPI.register(payload);
    localStorage.setItem("mfnet_portal_token", data.token);
    localStorage.setItem("mfnet_portal_member", JSON.stringify(data.member));
    setMember(data.member);
    return data.member;
  }

  function logout() {
    localStorage.removeItem("mfnet_portal_token");
    localStorage.removeItem("mfnet_portal_member");
    setMember(null);
  }

  return (
    <PortalAuthContext.Provider value={{ member, loading, login, register, logout }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used within PortalAuthProvider");
  return ctx;
}
