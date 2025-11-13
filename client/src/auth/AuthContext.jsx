// client/src/auth/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";

const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/auth/me");
        console.debug("[Auth] /auth/me response:", data);
        setUser(data?.user ?? null);
      } catch (err) {
        console.warn("[Auth] /auth/me failed:", err?.response ?? err.message ?? err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    setLastError(null);
    try {
      console.debug("[Auth] login request", { email });
      const res = await api.post("/auth/login", { email, password });
      console.debug("[Auth] login response", res?.data);
      if (res?.data?.user) {
        setUser(res.data.user);
        return res.data.user;
      }
      throw new Error(res?.data?.message ?? "Login failed: unexpected response");
    } catch (err) {
      console.error("[Auth] login error:", err?.response ?? err.message ?? err);
      const msg = err?.response?.data?.message ?? err?.message ?? "Login failed";
      setLastError(msg);
      // rethrow so UI code can catch if needed
      throw new Error(msg);
    }
  };

  const signup = async (payload) => {
    setLastError(null);
    try {
      console.debug("[Auth] signup request", payload);
      const { data } = await api.post("/auth/register", payload).catch(async (e) => {
        // fallback to /auth/signup if /register not present
        console.debug("[Auth] /auth/register failed, trying /auth/signup", e?.response?.status);
        return await api.post("/auth/signup", payload);
      });
      console.debug("[Auth] signup response", data);
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error("[Auth] signup error:", err?.response ?? err.message ?? err);
      const msg = err?.response?.data?.message ?? err?.message ?? "Signup failed";
      setLastError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.warn("[Auth] logout failed:", e?.response ?? e);
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(() => ({ user, loading, lastError, login, signup, logout }), [user, loading, lastError]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
