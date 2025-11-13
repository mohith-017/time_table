import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function TeacherDashboard(){
  const [slots, setSlots] = useState([]);

  useEffect(()=>{
    (async ()=>{
      const { data } = await api.get('/teacher/me/timetable');
      setSlots(data.slots || []);
    })();
  },[]);

  return (
    <div className="card">
      <h2>My Timetable (Slots)</h2>
      <table>
        <thead><tr><th>Day</th><th>Period</th><th>Course</th><th>Room</th><th>Class</th></tr></thead>
        <tbody>
          {slots.map((s,i)=>(
            <tr key={i}>
              <td>{['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s.day]}</td>
              <td>{s.period}</td>
              <td>{s.course?.code} {s.course?.name}</td>
              <td>{s.room?.name}</td>
              <td>{s.batch} - {s.section}</td>
            </tr>
          ))}
          {!slots.length && <tr><td colSpan="5" style={{textAlign:'center'}}>No slots yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
