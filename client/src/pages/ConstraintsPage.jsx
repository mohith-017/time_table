import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';

/**
 * Constraints editor:
 * - As TEACHER: edit your own unavailable periods via /teacher/me/unavailable
 * - As ADMIN: read-only note (teachers should set their own constraints)
 */
export default function ConstraintsPage(){
  const { user } = useAuth();
  const [unavail, setUnavail] = useState([]);
  const [saved, setSaved] = useState(false);

  const days = [1,2,3,4,5]; // Mon-Fri
  const periods = 6;        // default view; actual scheduling uses Settings

  useEffect(()=>{
    (async ()=>{
      if (user?.role === 'TEACHER') {
        // No direct GET for unavailable; we infer from timetable or keep local.
        // Start empty; teacher can set now.
      }
    })();
  },[user]);

  function toggle(day, period){
    const exists = unavail.find(u=>u.day===day && u.period===period);
    if (exists) setUnavail(unavail.filter(u=>!(u.day===day && u.period===period)));
    else setUnavail([...unavail, { day, period }]);
    setSaved(false);
  }

  async function save(){
    if (user?.role !== 'TEACHER') return;
    await api.put('/teacher/me/unavailable', { unavailable: unavail });
    setSaved(true);
  }

  if (user?.role === 'ADMIN') {
    return (
      <div className="card">
        <h2>Constraints</h2>
        <p className="muted">Teachers should log in to set their unavailable periods via this page. Admin can adjust
        global schedule parameters in <strong>Settings</strong> and regenerate timetables.</p>
      </div>
    );
  }

  return (
    <div className="grid" style={{gap:16}}>
      <div className="card">
        <h2>My Unavailable Periods</h2>
        <div style={{overflowX:'auto', marginTop:8}}>
          <table>
            <thead><tr><th>Day/Period</th>{Array.from({length:periods},(_,i)=>i+1).map(p=><th key={p}>{p}</th>)}</tr></thead>
            <tbody>
              {days.map(d=>(
                <tr key={d}>
                  <td style={{fontWeight:600}}>{['','Mon','Tue','Wed','Thu','Fri'][d]}</td>
                  {Array.from({length:periods},(_,i)=>i+1).map(p=>{
                    const on = unavail.some(u=>u.day===d && u.period===p);
                    return (
                      <td key={p} style={{textAlign:'center'}}>
                        <button className="link" onClick={()=>toggle(d,p)}>{on?'X':'—'}</button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        // ... (lines just before the end)
        <div className="spacer"></div>
        <button className="btn" onClick={save} disabled={user?.role!=='TEACHER'}>Save</button>
        {saved && <span style={{marginLeft:8, color:'var(--accent-2)'}}>Saved!</span>}
        <p className="muted" style={{marginTop:8}}>Generator will avoid these slots for you.</p>
      </div>
    </div>
  );
}
