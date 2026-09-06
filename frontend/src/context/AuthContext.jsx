import React, { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../api/resources";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("mfnet_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("mfnet_token");
        localStorage.removeItem("mfnet_user");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await authAPI.login({ email, password });
    localStorage.setItem("mfnet_token", data.token);
    localStorage.setItem("mfnet_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await authAPI.register(payload);
    localStorage.setItem("mfnet_token", data.token);
    localStorage.setItem("mfnet_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("mfnet_token");
    localStorage.removeItem("mfnet_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
