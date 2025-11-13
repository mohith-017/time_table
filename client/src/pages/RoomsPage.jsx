// client/src/pages/RoomsPage.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ name: "", capacity: 60, type: "LECTURE" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/admin/rooms");
      const list = Array.isArray(r.data) ? r.data : [];
      // dedupe by name or id
      const map = new Map();
      for (const x of list) {
        const key = x._id ?? (x.name && x.name.toLowerCase()) ?? Math.random();
        if (!map.has(key)) map.set(key, x);
      }
      setRooms(Array.from(map.values()));
    } catch (err) {
      console.error("Load rooms failed", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  async function add(e) {
    e?.preventDefault?.();
    if (!form.name) return alert("Enter name");
    try {
      await api.post("/admin/rooms", form);
      setForm({ name: "", capacity: 60, type: "LECTURE" });
      await load();
    } catch (err) {
      console.error("Add room failed", err);
      alert(err?.response?.data?.message || "Failed to add room");
    }
  }

  async function del(id) {
    if (!confirm("Delete room?")) return;
    try {
      await api.delete(`/admin/rooms/${id}`);
      await load();
    } catch (err) {
      console.error("Delete room failed", err);
      alert("Delete failed");
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Rooms</h3>

        <form onSubmit={add} className="form-inline" style={{ gap: 8 }}>
          <input placeholder="Name" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
          <input type="number" placeholder="Capacity" value={form.capacity} onChange={e => setForm(prev => ({ ...prev, capacity: Number(e.target.value) }))} style={{ width: 110 }} />
          <select value={form.type} onChange={e => setForm(prev=> ({ ...prev, type: e.target.value }))}>
            <option value="LECTURE">LECTURE</option>
            <option value="LAB">LAB</option>
          </select>
          <button className="btn" type="submit">Add Room</button>
          <button className="btn gray" type="button" onClick={load}>Reload</button>
        </form>

        <div style={{ marginTop: 12 }}>
          <table className="tt">
            <thead><tr><th>Name</th><th>Capacity</th><th>Type</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="muted">Loading…</td></tr>
              ) : rooms.length === 0 ? (
                <tr><td colSpan={4} className="muted">No rooms yet.</td></tr>
              ) : rooms.map(r => (
                <tr key={r._id || r.name}>
                  <td>{r.name}</td>
                  <td>{r.capacity}</td>
                  <td>{r.type}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn red" onClick={() => del(r._id)}>Delete</button>
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
