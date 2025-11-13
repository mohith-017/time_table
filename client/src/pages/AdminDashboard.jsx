// client/src/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function AdminDashboard() {
  const [msg, setMsg] = useState("");
  const [classes, setClasses] = useState([]);
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [newSemester, setNewSemester] = useState("");
  const [newSection, setNewSection] = useState("");

  const nav = useNavigate();

  useEffect(() => { loadClasses(); }, []);

  async function loadClasses() {
    setLoadingClasses(true);
    try {
      const r = await api.get("/admin/classes");
      const c = r.data || [];
      const cls = Array.isArray(c) ? c : [];
      // Normalise each item to { batch, semester, section, _id? }
      const norm = cls.map(item => {
        const batch = item.batch ?? item.semester ?? "";
        return { ...item, batch, semester: batch, section: item.section ?? item.sec ?? "" };
      });
      setClasses(norm);

      // set defaults if empty selection
      if (norm.length && !semester) {
        setSemester(norm[0].semester || norm[0].batch || "");
        setSection(norm[0].section || "");
      }
    } catch (e) {
      console.error("Load classes failed", e);
      setClasses([]);
      setMsg("Failed to load semesters/sections (see console).");
    } finally {
      setLoadingClasses(false);
    }
  }

  async function addClass(e) {
    e?.preventDefault?.();
    const sem = (newSemester || "").trim();
    const sec = (newSection || "A").trim() || "A";
    if (!sem) return alert("Enter semester");
    try {
      // send as 'batch' to server (server accepts semester or batch)
      await api.post("/admin/classes", { batch: sem, section: sec });
      setNewSemester(""); setNewSection("");
      await loadClasses();
      setMsg(`Added ${sem} • ${sec}`);
    } catch (err) {
      console.error("Add class failed", err);
      const message = err?.response?.data?.message ?? err?.message ?? "Failed to add class";
      alert(message);
      setMsg(String(message));
    }
  }

  async function deleteClass(item) {
    // item may be { _id, batch, semester, section }
    const batchVal = item.batch || item.semester || "";
    const sectionVal = item.section || "";
    if (!batchVal || !sectionVal) return alert("Invalid class item");
    if (!confirm(`Delete ${batchVal} • ${sectionVal}?`)) return;

    try {
      // server expects DELETE /admin/classes?batch=...&section=...
      await api.delete("/admin/classes", { params: { batch: batchVal, section: sectionVal } });
      setMsg(`Deleted ${batchVal} • ${sectionVal}`);
      await loadClasses();
      // if the deleted one was currently selected, clear selection
      if (semester === batchVal && section === sectionVal) {
        setSemester("");
        setSection("");
      }
    } catch (err) {
      console.error("Delete class failed", err);
      const message = err?.response?.data?.message ?? "Delete failed";
      alert(message);
      setMsg(String(message));
    }
  }

  // --- THIS IS THE CORRECTED FUNCTION ---
  async function generate() {
    if (!semester || !section) {
      alert("Please select a semester and section to generate for.");
      return;
    }
    if (!confirm(`Generate timetable for ${semester} • ${section}?`)) return;
    setGenerating(true);
    setMsg("");
    try {
      // Correct: POST to /admin/generate with data in the body
      const r = await api.post("/admin/generate", { 
        batch: semester, // server accepts 'batch' or 'semester'
        section: section 
      });
      
      const placed = r.data?.placed ?? r.data?.count ?? r.data ?? 0;
      setMsg(`Generation complete — placed ${placed} slots.`);
      
      // navigate to timetable with query params so admin can view immediately
      nav(`/timetable?semester=${encodeURIComponent(semester)}&section=${encodeURIComponent(section)}`);
    } catch (e) {
      console.error("Generate failed", e);
      const text = e?.response?.data?.message ?? e?.message ?? "Generate failed";
      setMsg(String(text));
      alert(String(text));
    } finally {
      setGenerating(false);
    }
  }

  function openTimetable() {
    if (!semester || !section) return alert("Select semester and section first");
    nav(`/timetable?semester=${encodeURIComponent(semester)}&section=${encodeURIComponent(section)}`);
  }

  return (
    <div className="container">
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
          <p className="muted" style={{ margin: 0 }}>Manage teachers, rooms, courses, semesters and generate timetables.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link className="btn" to="/admin/teachers">Teachers</Link>
          <Link className="btn" to="/admin/rooms">Rooms</Link>
          <Link className="btn" to="/admin/courses">Courses</Link>
          <Link className="btn" to="/admin/settings">Settings</Link>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Semesters & Sections</h3>

        <form onSubmit={addClass} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input placeholder="Semester (e.g. Semester 1)" value={newSemester} onChange={e => setNewSemester(e.target.value)} />
          <input placeholder="Section (e.g. A)" value={newSection} onChange={e => setNewSection(e.target.value)} style={{ width: 120 }} />
          <button className="btn" type="submit">Add</button>
          <button className="btn gray" type="button" onClick={loadClasses}>Reload</button>
        </form>

        <div style={{ marginTop: 8 }}>
          <table className="tt">
            <thead><tr><th>Semester</th><th>Section</th><th>Actions</th></tr></thead>
            <tbody>
              {loadingClasses ? (
                <tr><td colSpan={3} className="muted">Loading…</td></tr>
              ) : classes.length === 0 ? (
                <tr><td colSpan={3} className="muted">No semesters/sections yet</td></tr>
              ) : (
                classes.map(c => {
                  const key = c._id || `${c.batch}|${c.section}`;
                  return (
                    <tr key={key}>
                      <td>{c.batch || c.semester || '-'}</td>
                      <td>{c.section || '-'}</td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button className="btn" onClick={() => { setSemester(c.batch || c.semester); setSection(c.section); }}>Select</button>
                        <button className="btn gray" onClick={() => openTimetable()}>View</button>
                        <button className="btn red" onClick={() => deleteClass(c)}>Delete</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Generate Timetable</h3>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div>
            <label className="muted">Semester</label>
            <select value={semester} onChange={e => setSemester(e.target.value)}>
              <option value="">-- select semester --</option>
              {Array.from(new Set(classes.map(c => c.batch || c.semester))).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="muted">Section</label>
            <select value={section} onChange={e => setSection(e.target.value)}>
              <option value="">-- select section --</option>
              {Array.from(new Set(classes.filter(c => !semester || (c.batch || c.semester) === semester).map(c => c.section))).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn red" onClick={generate} disabled={generating}>{generating ? "Generating…" : "Generate"}</button>
            <button className="btn" onClick={openTimetable}>Open Timetable</button>
          </div>
        </div>

        {msg && <div className="muted" style={{ marginTop: 8 }}>{msg}</div>}
      </div>
    </div>
  );
}