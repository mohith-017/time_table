// client/src/CoursesPage.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api"; // adjust path if your api.js is elsewhere

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);

  // form fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("LECTURE");
  const [hours, setHours] = useState(4);
  const [teacher, setTeacher] = useState("");

  // filter (empty = show all)
  const [semesterFilter, setSemesterFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line
  }, []);

  async function loadAll() {
    setLoading(true);
    setErrorMsg("");
    try {
      // load classes first (so filter options are available)
      const clsRes = await api.get("/admin/classes").catch(() => ({ data: [] }));
      const cls = Array.isArray(clsRes?.data) ? clsRes.data : [];
      const normalised = cls.map(it => {
        const batch = it.batch ?? it.semester ?? "";
        return { ...it, batch, semester: batch, section: it.section ?? it.sec ?? "" };
      });
      setClasses(normalised);

      // decide params for courses listing: if no filter -> no params (get all)
      const params = {};
      if (semesterFilter) params.batch = semesterFilter;
      if (sectionFilter) params.section = sectionFilter;

      const [coursesRes, teachersRes] = await Promise.all([
        api.get("/admin/courses", { params }).catch(err => { throw { op: "courses", err }; }),
        api.get("/admin/teachers").catch(err => { throw { op: "teachers", err }; })
      ]);

      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
      setTeachers(Array.isArray(teachersRes.data) ? teachersRes.data : []);
    } catch (err) {
      console.error("LoadAll error:", err);
      if (err?.op && err?.err?.response) {
        setErrorMsg(`${err.op} load failed: ${err.err.response.status} ${JSON.stringify(err.err.response.data)}`);
      } else {
        setErrorMsg(String(err?.message ?? err));
      }
      setCourses([]);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }

  // add course (sends batch=semesterFilter if provided; otherwise sends no batch => server may accept)
  async function add(e) {
    e.preventDefault();
    setErrorMsg("");
    try {
      const payload = {
        code: String(code).trim(),
        name: String(name).trim(),
        type,
        hoursPerWeek: Number(hours) || 0,
        // send batch only if a semester value is provided in UI (otherwise server will create course without batch)
        ...(semesterFilter ? { batch: String(semesterFilter).trim() } : {}),
        ...(sectionFilter ? { section: String(sectionFilter).trim() } : {}),
      };
      if (teacher) payload.teacher = teacher;

      const res = await api.post("/admin/courses", payload);
      // clear form
      setCode(""); setName(""); setHours(4); setTeacher("");
      // reload courses (keep current filters)
      await loadAll();
    } catch (err) {
      console.error("Add course error:", err);
      const serverMsg = err?.response?.data?.message || err?.response?.data || err?.message;
      setErrorMsg("Add failed: " + String(serverMsg));
      alert("Add course failed: " + String(serverMsg));
    }
  }

  async function del(id) {
    if (!confirm("Delete course?")) return;
    try {
      await api.delete(`/admin/courses/${id}`);
      await loadAll();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Delete failed: " + (err?.response?.data?.message || err?.message || ""));
    }
  }

  function onFilterChange(nextSemester, nextSection) {
    setSemesterFilter(nextSemester);
    setSectionFilter(nextSection);
    // reload with new filters
    setTimeout(() => loadAll(), 0);
  }

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Courses</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <div>
            <label className="muted">Semester (filter)</label>
            <select value={semesterFilter} onChange={e => onFilterChange(e.target.value, sectionFilter)}>
              <option value="">-- all semesters --</option>
              {Array.from(new Set(classes.map(c => c.batch || c.semester).filter(Boolean))).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="muted">Section (filter)</label>
            <select value={sectionFilter} onChange={e => onFilterChange(semesterFilter, e.target.value)}>
              <option value="">-- all sections --</option>
              {Array.from(new Set(classes.filter(c => !semesterFilter || c.batch === semesterFilter || c.semester === semesterFilter).map(c => c.section).filter(Boolean))).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button className="btn" onClick={loadAll}>Reload</button>
        </div>

        <form onSubmit={add} style={{ display: "grid", gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          <input placeholder="Code" value={code} onChange={e => setCode(e.target.value)} required />
          <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="LECTURE">LECTURE</option>
            <option value="LAB">LAB</option>
          </select>
          <input type="number" placeholder="Hours/week" value={hours} onChange={e => setHours(e.target.value)} style={{ width: 120 }} />

          <div style={{ gridColumn: "1 / -1" }}>
            <label className="muted">Teacher (optional)</label>
            <select value={teacher} onChange={e => setTeacher(e.target.value)} style={{ width: "100%" }}>
              <option value="">-- assign teacher (optional) --</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.name} {t.email ? `(${t.email})` : ''}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button className="btn" type="submit">Add Course</button>
          </div>
        </form>

        {errorMsg && <div style={{ marginTop: 8, color: "var(--danger)" }}>{errorMsg}</div>}
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Courses list {loading && <span className="muted"> (loading...)</span>}</h4>
        <div style={{ overflowX: "auto" }}>
          <table className="tt">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Hours</th>
                <th>Teacher</th>
                <th>Semester/Batch</th>
                <th>Section</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr><td colSpan={8} className="muted">No courses found for selected filters.</td></tr>
              ) : courses.map(c => (
                <tr key={c._id}>
                  <td>{c.code}</td>
                  <td>{c.name}</td>
                  <td>{c.type}</td>
                  <td>{c.hoursPerWeek}</td>
                  <td>{c.teacher?.name || "-"}</td>
                  <td>{c.batch || c.semester || "-"}</td>
                  <td>{c.section || "-"}</td>
                  <td><button className="btn red" onClick={() => del(c._id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
