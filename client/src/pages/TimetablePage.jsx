// client/src/pages/TimetablePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext.jsx";
import { Navigate, useLocation } from "react-router-dom";

const WEEK = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function parseTimetablePayload(payload) {
  // Accepts: array (grid), or { grid: [...] }, or { timetable: { grid: [...] } }, or full doc
  if (!payload) return null;
  if (Array.isArray(payload)) return payload;
  if (payload.grid && Array.isArray(payload.grid)) return payload.grid;
  if (payload.timetable && payload.timetable.grid && Array.isArray(payload.timetable.grid)) return payload.timetable.grid;
  // maybe payload is the doc itself with fields 'grid' etc
  for (const key of ["data","result","items"]) {
    if (payload[key] && Array.isArray(payload[key].grid)) return payload[key].grid;
  }
  return null;
}

export default function TimetablePage() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  // auth protection
  if (!authLoading && !user) return <Navigate to="/login" replace />;

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const qSemester = qs.get("semester") || qs.get("batch") || "";
  const qSection = qs.get("section") || qs.get("sec") || "";

  const [semester, setSemester] = useState(qSemester || "");
  const [section, setSection] = useState(qSection || "");
  const [settings, setSettings] = useState(null);
  const [timetableGrid, setTimetableGrid] = useState(null); // null = not loaded, [] = loaded but empty
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // update from query when navigation occurs
  useEffect(() => {
    if (qSemester) setSemester(qSemester);
    if (qSection) setSection(qSection);
  }, [qSemester, qSection]);

  const ensureArray = x => Array.isArray(x) ? x : (Array.isArray(x?.data) ? x.data : []);

  async function load() {
    setLoading(true);
    setErrorMsg("");
    setTimetableGrid(null);
    try {
      // send both keys for max compatibility
      const params = { batch: semester, semester: semester, section };

      const [sRes, cRes, rRes, ttRes, classesRes] = await Promise.allSettled([
        api.get("/admin/settings"),
        api.get("/admin/courses", { params }),
        api.get("/admin/rooms"),
        api.get("/api/timetable" /* some setups use /api prefix on client; use api instance baseURL */, { params }),
        api.get("/admin/classes")
      ]);

      if (sRes.status === "fulfilled") setSettings(sRes.value?.data ?? sRes.value);
      if (cRes.status === "fulfilled") setCourses(ensureArray(cRes.value?.data ?? cRes.value));
      if (rRes.status === "fulfilled") setRooms(ensureArray(rRes.value?.data ?? rRes.value));
      if (classesRes.status === "fulfilled") setClasses(ensureArray(classesRes.value?.data ?? classesRes.value));

      // timetable: defensive parsing
      if (ttRes.status === "fulfilled") {
        const payload = ttRes.value?.data ?? ttRes.value;
        const grid = parseTimetablePayload(payload);
        if (grid === null) {
          // maybe API returned the whole doc under different key
          // fallback: if payload has any array property that looks like grid, try find it
          const maybeGrid = Object.values(payload || {}).find(v => Array.isArray(v) && v.length && (v[0].day !== undefined || v[0].break !== undefined || v[0].period !== undefined));
          setTimetableGrid(Array.isArray(maybeGrid) ? maybeGrid : []);
        } else {
          setTimetableGrid(grid);
        }
      } else {
        // failed to fetch timetable
        setTimetableGrid([]);
        setErrorMsg("Failed to load timetable (server returned error).");
        console.warn("Timetable GET error:", ttRes.reason);
      }
    } catch (err) {
      console.error("Timetable load error:", err);
      setTimetableGrid([]);
      setErrorMsg(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // only load if semester & section provided (avoid accidental loads)
    if (!semester || !section) {
      setTimetableGrid(null);
      return;
    }
    load();
    // eslint-disable-next-line
  }, [semester, section]);

  // Build a map for courses and rooms for nicer labels
  const courseById = useMemo(() => new Map((courses || []).map(c => [String(c._id ?? c.id ?? c.courseId ?? c.code ?? c.name ?? ""), c])), [courses]);
  const roomById = useMemo(() => new Map((rooms || []).map(r => [String(r._id ?? r.id ?? r.roomId ?? r.name ?? ""), r])), [rooms]);

  // determine working days (use settings if available, otherwise Mon-Fri)
  const workingDays = useMemo(() => {
    if (settings?.workingDays && Array.isArray(settings.workingDays) && settings.workingDays.length) return settings.workingDays;
    return [1,2,3,4,5];
  }, [settings]);

  // Build header cells for a day by inspecting the day's entries in the grid (keeps breaks where generator placed them)
  function headerCellsForDay(day) {
    if (!Array.isArray(timetableGrid)) return [];
    const dayCells = timetableGrid.filter(s => Number(s.day) === Number(day));
    // if no dayCells, return a canonical P1..P6 header
    if (!dayCells || dayCells.length === 0) return Array.from({ length: 6 }, (_,i) => ({ type: "period", label: `P${i+1}` }));
    // Map each slot in order into header items
    return dayCells.map(slot => {
      if (slot.break) {
        const kind = slot.break;
        const mins = slot.minutes ?? slot.length ?? (kind === "tea" ? 15 : 45);
        return { type: "break", kind, minutes: mins };
      } else {
        // period slot
        return { type: "period", label: `P${slot.period ?? "?"}`, period: slot.period };
      }
    });
  }

  function renderCell(slot) {
    // slot may be { break: 'tea' } or { day, period, course, courseCode, room } or similar
    if (!slot) return null;
    if (slot.break) {
      const label = slot.break === "tea" ? `Tea ${slot.minutes ?? slot.length ?? 15}m` : `Lunch ${slot.minutes ?? slot.length ?? 45}m`;
      return <div style={{ textAlign: "center", fontWeight: 700 }} className={`muted break ${slot.break}`}>{label}</div>;
    }
    const courseId = slot.course ?? slot.courseId ?? slot.c ?? slot.courseCode;
    const c = courseById.get(String(courseId)) ?? (slot.courseCode ? { code: slot.courseCode, name: slot.courseCode } : null);
    const r = roomById.get(String(slot.room ?? slot.roomId ?? slot.r)) ?? null;

    return (
      <div>
        <div style={{ fontWeight: 700 }}>{c?.code ?? c?.name ?? String(slot.course ?? slot.courseCode ?? "")}</div>
        {slot.teacherName ? <div className="muted">{slot.teacherName}</div> : (c?.teacher ? <div className="muted">{c.teacher.name ?? ""}</div> : null)}
        {r ? <div className="muted" style={{ fontSize: 12 }}>{r.name}</div> : (slot.room ? <div className="muted" style={{ fontSize: 12 }}>{slot.room}</div> : null)}
      </div>
    );
  }

  // create header from first working day
  const canonicalHeader = useMemo(() => {
    if (!Array.isArray(timetableGrid)) return [];
    const firstDay = (workingDays && workingDays.length) ? workingDays[0] : 1;
    return headerCellsForDay(firstDay);
  }, [timetableGrid, settings, workingDays]);

  // UI
  if (authLoading) return <div className="container"><div className="card">Checking session…</div></div>;

  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      <div className="card page-head" style={{ alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Timetable</h2>
          <div className="muted">Showing timetable for <strong>{semester || "—"}</strong> • <strong>{section || "—"}</strong></div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="muted">Semester</label>
          <input value={semester} onChange={e => setSemester(e.target.value)} style={{ width: 140 }} />
          <label className="muted">Section</label>
          <input value={section} onChange={e => setSection(e.target.value)} style={{ width: 80 }} />
          <button className="btn gray" onClick={load}>Load</button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {loading ? (
        <div className="card muted">Loading timetable…</div>
      ) : errorMsg ? (
        <div className="card" style={{ color: "var(--danger)" }}>{errorMsg}</div>
      ) : timetableGrid == null ? (
        <div className="card muted">No class selected. Please choose a semester and section and click Load or generate a timetable from Admin.</div>
      ) : Array.isArray(timetableGrid) && timetableGrid.length === 0 ? (
        <div className="card muted">No timetable found for this class (empty). Generate it from Admin → Generate.</div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tt" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Day</th>
                {canonicalHeader.map((h, idx) => {
                  if (h.type === "period") return <th key={idx}>{h.label}</th>;
                  return <th key={idx} className={`break-col ${h.kind === "tea" ? "short" : "medium"}`} style={{ textAlign: "center" }}>{h.kind === "tea" ? `Tea\n${h.minutes}m` : `Lunch\n${h.minutes}m`}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {workingDays.map(day => {
                const dayCells = timetableGrid.filter(s => Number(s.day) === Number(day));
                // If the day's number of cells differs from canonical, we will still render dayCells in order
                return (
                  <tr key={day}>
                    <td style={{ width: 120 }}><strong>{WEEK[day % 7]}</strong></td>
                    {dayCells.map((slot, i) => (
                      <td key={`${day}-${i}`}>{renderCell(slot)}</td>
                    ))}
                    {/* if a day has fewer cells than canonical, fill remnant columns */}
                    {dayCells.length < canonicalHeader.length ? Array.from({ length: canonicalHeader.length - dayCells.length }).map((_, k) => <td key={`pad-${day}-${k}`} />) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
