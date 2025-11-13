// client/src/pages/Login.jsx - REPLACE the entire file
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const roleQuery = (params.get("role") || "").toUpperCase();

  const [role] = useState(roleQuery || "");
  const [email, setEmail] = useState(role === "ADMIN" ? "admin@example.com" : "");
  const [password, setPassword] = useState(role === "ADMIN" ? "admin123" : "");
  const [err, setErr] = useState("");
  const [adminSignupForm, setAdminSignupForm] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const user = await login(email, password);
      if (!user) throw new Error("No user returned");
      if (user.role === "ADMIN") nav("/admin");
      else if (user.role === "TEACHER") nav("/teacher");
      else nav("/student");
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Login failed");
    }
  };

  const adminSignupSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!adminName || !adminEmail || !adminPassword) {
      return setErr("All fields are required for Admin Sign-up.");
    }
    setAdminLoading(true);
    try {
      // Use the signup function but force the role to ADMIN
      await signup({ name: adminName, email: adminEmail, password: adminPassword, role: 'ADMIN' });
      setErr("Admin account created successfully. Please login.");
      setAdminSignupForm(false);
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Admin Sign-up failed.");
    } finally {
      setAdminLoading(false);
    }
  };


  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 480, margin: "40px auto" }}>
        <h2 style={{ marginTop: 0 }}>Login {role ? `— ${role}` : ""}</h2>

        {err && (
          <div style={{ color: "var(--danger)", marginBottom: 10 }}>
            {err}
          </div>
        )}

        {/* Normal Login Form */}
        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Email</label>
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button className="btn" type="submit">Login</button>
            
            {role === 'ADMIN' ? (
              <button 
                type="button" 
                className="btn gray" 
                onClick={() => setAdminSignupForm(f => !f)}
              >
                {adminSignupForm ? "Hide Admin Signup" : "Admin Sign-up"}
              </button>
            ) : (
              <a
                className="btn gray"
                href={role ? `/signup?role=${encodeURIComponent(role)}` : "/signup"}
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "8px 12px" }}
              >
                Go to Sign-up
              </a>
            )}
          </div>
        </form>

        {/* Admin Signup Form (Conditional) */}
        {role === 'ADMIN' && adminSignupForm && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--br)', paddingTop: 15 }}>
            <h3 style={{ marginTop: 0 }}>Admin Sign-up</h3>
            <form onSubmit={adminSignupSubmit} style={{ display: "grid", gap: 10 }}>
              <input required placeholder="Name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
              <input required type="email" placeholder="Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              <input required type="password" placeholder="Password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
              <button className="btn" type="submit" disabled={adminLoading}>
                {adminLoading ? "Creating…" : "Create Admin Account"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}