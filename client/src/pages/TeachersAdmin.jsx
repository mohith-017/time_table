// client/src/TeachersAdmin.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function TeachersAdmin() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/admin/teachers");
      const list = Array.isArray(r.data) ? r.data : [];
      // dedupe by _id or email
      const map = new Map();
      for (const t of list) {
        const key = t._id ?? (t.email && t.email.toLowerCase()) ?? Math.random();
        if (!map.has(key)) map.set(key, t);
      }
      setTeachers(Array.from(map.values()));
    } catch (err) {
      console.error("Load teachers failed", err);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }

  async function add(e) {
    e?.preventDefault?.();
    if (!name || !email) return alert("Name & email required");
    try {
      await api.post("/admin/teachers", { name, email });
      setName(""); setEmail("");
      await load();
    } catch (err) {
      console.error("Add teacher failed", err);
      alert(err?.response?.data?.message || "Failed to add teacher");
    }
  }

  async function remove(id) {
    if (!confirm("Delete this teacher?")) return;
    try {
      await api.delete(`/admin/teachers/${id}`);
      await load();
    } catch (err) {
      console.error("Delete teacher failed", err);
      alert(err?.response?.data?.message || "Delete failed");
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Teachers</h3>

        <form onSubmit={add} className="form-inline" style={{ gap: 8 }}>
          <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <button className="btn" type="submit">Add</button>
          <button className="btn gray" type="button" onClick={load}>Reload</button>
        </form>

        <div style={{ marginTop: 12 }}>
          <table className="tt">
            <thead><tr><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="muted">Loading…</td></tr>
              ) : teachers.length === 0 ? (
                <tr><td colSpan={3} className="muted">No teachers yet.</td></tr>
              ) : teachers.map(t => (
                <tr key={t._id || t.email}>
                  <td>{t.name}</td>
                  <td>{t.email}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn red" onClick={()=>remove(t._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
