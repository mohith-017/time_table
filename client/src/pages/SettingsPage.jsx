// client/src/SettingsPage.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Link } from "react-router-dom";

const WEEK_LABELS = [
  { num: 1, name: "Sun" }, { num: 2, name: "Mon" }, { num: 3, name: "Tue" },
  { num: 4, name: "Wed" }, { num: 5, name: "Thu" }, { num: 6, name: "Fri" },
  { num: 7, name: "Sat" }
];

export default function SettingsPage(){
  const [settings, setSettings] = useState(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ load(); }, []);

  async function load(){
    try {
      const r = await api.get("/admin/settings");
      const s = r.data || r;
      if (!s.dayConfig || !Array.isArray(s.dayConfig)) {
        const defaults = WEEK_LABELS.map(w => ({
          day: w.num,
          start: "09:00",
          end: "17:00",
          periods: 6,
          periodMinutes: 60,
          teaBreak: { startAfterPeriod: 2, minutes: 15 },
          lunchBreak: { startAfterPeriod: 4, minutes: 45 }
        }));
        setSettings({ workingDays: s.workingDays ?? [2,3,4,5,6], dayConfig: defaults });
      } else {
        const dc = [...s.dayConfig];
        WEEK_LABELS.forEach(w => {
          if (!dc.find(x => Number(x.day) === w.num)) {
            dc.push({
              day: w.num,
              start: "09:00",
              end: "17:00",
              periods: 6,
              periodMinutes: 60,
              teaBreak: { startAfterPeriod: 2, minutes: 15 },
              lunchBreak: { startAfterPeriod: 4, minutes: 45 }
            });
          }
        });
        dc.sort((a,b)=>Number(a.day)-Number(b.day));
        setSettings({ workingDays: s.workingDays ?? [2,3,4,5,6], dayConfig: dc });
      }
    } catch (err) {
      console.error("Load settings failed", err);
      setMsg("Failed to load settings");
    }
  }

  function updateDay(dayNum, patch) {
    setSettings(prev => {
      const dc = (prev?.dayConfig || []).map(d => d.day === dayNum ? ({...d, ...patch}) : d);
      return {...prev, dayConfig: dc};
    });
  }

  function toggleWorkingDay(dayNum) {
    setSettings(prev => {
      const arr = new Set(prev?.workingDays || []);
      if (arr.has(dayNum)) arr.delete(dayNum); else arr.add(dayNum);
      return {...prev, workingDays: Array.from(arr).sort((a,b)=>a-b)};
    });
  }

  async function save(e){
    e?.preventDefault?.();
    setSaving(true); setMsg("");
    try {
      await api.put("/admin/settings", settings);
      setMsg("Saved");
    } catch (err) {
      console.error("Save settings failed", err);
      setMsg("Save failed");
    } finally { setSaving(false); }
  }

  if (!settings) return <div className="container"><div className="card">Loading…</div></div>;

  return (
    <div className="container">
      <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h2 style={{margin:0}}>Settings</h2>
          <p className="muted" style={{margin:0}}>Configure working days and day-wise timetable rules (periods, times, tea & lunch).</p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <Link className="btn" to="/admin">Back</Link>
          <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save All"}</button>
        </div>
      </div>

      <div style={{height:12}} />

      <div className="card">
        <h3 style={{marginTop:0}}>Working days</h3>

        <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
          {WEEK_LABELS.map(w => {
            const checked = (settings.workingDays || []).includes(w.num);
            return (
              <label key={w.num} style={{display:'flex', alignItems:'center', gap:8}}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleWorkingDay(w.num)}
                />
                <span style={{minWidth:48}}>{w.name}</span>
              </label>
            );
          })}
        </div>

        <div style={{marginTop:8}} className="muted">Select the days that are working days. The timetable view will render only those days.</div>
      </div>

      <div style={{height:12}} />

      <form onSubmit={save}>
        {settings.dayConfig.map((dCfg) => (
          <div key={dCfg.day} className="card" style={{marginBottom:12}}>
            <h4 style={{marginTop:0}}>{WEEK_LABELS.find(w=>w.num===Number(dCfg.day))?.name} (day {dCfg.day})</h4>

            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, alignItems:'center'}}>
              <div>
                <label>Start time</label>
                <input value={dCfg.start} onChange={e=>updateDay(dCfg.day, { start: e.target.value })} />
              </div>

              <div>
                <label>End time</label>
                <input value={dCfg.end} onChange={e=>updateDay(dCfg.day, { end: e.target.value })} />
              </div>

              <div>
                <label>Periods</label>
                <input type="number" min={1} value={dCfg.periods} onChange={e=>updateDay(dCfg.day, { periods: Number(e.target.value) || 1 })} />
              </div>

              <div>
                <label>Period minutes</label>
                <input type="number" min={10} value={dCfg.periodMinutes} onChange={e=>updateDay(dCfg.day, { periodMinutes: Number(e.target.value) || 60 })} />
              </div>
            </div>

            <div style={{height:8}} />

            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8}}>
              <div>
                <label>Tea — after period</label>
                <input type="number" min={0} value={dCfg?.teaBreak?.startAfterPeriod ?? dCfg?.teaBreak?.startPeriod ?? 0}
                  onChange={e=>{
                    const v = Number(e.target.value) || 0;
                    updateDay(dCfg.day, { teaBreak: { ...(dCfg.teaBreak||{}), startAfterPeriod: v } });
                  }} />
              </div>

              <div>
                <label>Tea minutes</label>
                <input type="number" min={0} value={dCfg?.teaBreak?.minutes ?? dCfg?.teaBreak?.length ?? 15}
                  onChange={e=>{
                    const v = Number(e.target.value) || 0;
                    updateDay(dCfg.day, { teaBreak: { ...(dCfg.teaBreak||{}), minutes: v } });
                  }} />
              </div>

              <div>
                <label>Lunch — after period</label>
                <input type="number" min={0} value={dCfg?.lunchBreak?.startAfterPeriod ?? dCfg?.lunchBreak?.startPeriod ?? 0}
                  onChange={e=>{
                    const v = Number(e.target.value) || 0;
                    updateDay(dCfg.day, { lunchBreak: { ...(dCfg.lunchBreak||{}), startAfterPeriod: v } });
                  }} />
              </div>

              <div>
                <label>Lunch minutes</label>
                <input type="number" min={0} value={dCfg?.lunchBreak?.minutes ?? dCfg?.lunchBreak?.length ?? 45}
                  onChange={e=>{
                    const v = Number(e.target.value) || 0;
                    updateDay(dCfg.day, { lunchBreak: { ...(dCfg.lunchBreak||{}), minutes: v } });
                  }} />
              </div>
            </div>

            <div style={{marginTop:8}} className="muted">
              Tip: set start/end times and periodMinutes to control the clock durations. Breaks are placed after the specified period (use 0 to disable).
            </div>
          </div>
        ))}

        <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
          <button className="btn" type="button" onClick={save}>{saving ? "Saving…" : "Save settings"}</button>
        </div>
      </form>

      {msg && <div style={{marginTop:12}} className="muted">{msg}</div>}
    </div>
  );
}
