// client/src/pages/SignUp.jsx
import React, { useState } from "react";
import { api } from "../api";
import { useNavigate, useLocation } from "react-router-dom"; // Added useLocation

export default function Signup() {
  const nav = useNavigate();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const roleQuery = (params.get("role") || "").toUpperCase();

  const [role, setRole] = useState(roleQuery || "STUDENT"); // STUDENT | TEACHER | ADMIN
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [semester, setSemester] = useState(""); // This will store the batch/semester number
  const [section, setSection] = useState("");
  const [serverMsg, setServerMsg] = useState("");
  const [serverErrorDetails, setServerErrorDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // Removed: classes state and useEffect for loading classes

  function resetMsg() {
    setServerMsg("");
    setServerErrorDetails(null);
  }

  function validate() {
    if (!name.trim() || !email.trim()) {
      setServerMsg("Name and email are required.");
      return false;
    }
    if (password.length < 6) {
      setServerMsg("Password must be at least 6 characters.");
      return false;
    }
    if (role === "STUDENT" && (!semester || !section)) {
      setServerMsg("Semester/Batch and Section are required for students.");
      return false;
    }
    resetMsg();
    return true;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const payload = { name, email, password, role };
    if (role === "STUDENT") {
      // For a student, 'semester' becomes the 'batch' (e.g., '5')
      payload.batch = String(semester);
      payload.section = section;
    }

    try {
      const { data } = await api.post("/auth/register", payload); // .data?.user is returned
      setServerMsg(`Signup successful! Welcome, ${data.user.name}. Please go to the Login page.`);
      setServerErrorDetails(null);
      // Optional: Clear form
      // setName(""); setEmail(""); setPassword(""); setSemester(""); setSection("");
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Signup failed";
      setServerMsg(`Error: ${msg}`);
      setServerErrorDetails(e?.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 480, margin: "40px auto" }}>
        <h2 style={{ marginTop: 0 }}>Sign Up</h2>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {["STUDENT", "TEACHER"].map((r) => (
            <button
              key={r}
              className={`btn ${role === r ? "" : "gray"}`}
              onClick={() => {
                setRole(r);
                resetMsg();
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <input required placeholder="Full Name" value={name} onChange={(e) => { setName(e.target.value); resetMsg(); }} />
          <input required type="email" placeholder="Email" value={email} onChange={(e) => { setEmail(e.target.value); resetMsg(); }} />
          <input required type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => { setPassword(e.target.value); resetMsg(); }} />

          {role === "STUDENT" && (
            <>
              <div>
                <label>Semester/Batch</label>
                <select value={semester} onChange={(e)=>setSemester(e.target.value)}>
                  <option value="">-- select --</option>
                  {/* Fixed 1-8 semester list, as requested */}
                  {Array.from({length: 8}, (_,i)=>i+1).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <input placeholder="Section (e.g. A)" value={section} onChange={(e)=>setSection(e.target.value)} />
            </>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" disabled={loading} type="submit">{loading ? "Signing..." : "Sign up"}</button>
            <button type="button" className="btn gray" onClick={()=>nav("/login")}>Go to Login</button>
          </div>
        </form>

        {serverMsg && <div style={{ marginTop: 12 }} className="muted">{serverMsg}</div>}

        {serverErrorDetails && (
          <details style={{ marginTop: 10, color: "var(--danger)" }}>
            <summary style={{ cursor: "pointer" }}>Server response (debug)</summary>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: "10px", padding: 8, background: "var(--card)", border: "1px solid var(--danger)", borderRadius: 6 }}>
              {JSON.stringify(serverErrorDetails, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}