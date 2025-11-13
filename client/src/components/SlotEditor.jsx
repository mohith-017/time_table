import React, { useState } from 'react';

export default function SlotEditor({ courses, rooms, onSave, initial }){
  const [course, setCourse] = useState(initial?.course||'');
  const [room, setRoom] = useState(initial?.room||'');
  return (
    <div className="card">
      <div style={{display:'grid', gap:8}}>
        <select value={course} onChange={e=>setCourse(e.target.value)}>
          <option value="">Select course</option>
          {courses.map(c=> <option key={c._id} value={c._id}>{c.code} — {c.name}</option>)}
        </select>
        <select value={room} onChange={e=>setRoom(e.target.value)}>
          <option value="">Select room</option>
          {rooms.map(r=> <option key={r._id} value={r._id}>{r.name} ({r.type})</option>)}
        </select>
        <button className="btn" onClick={()=>onSave({ course, room })}>Save</button>
      </div>
    </div>
  );
}
