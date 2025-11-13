import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function StudentDashboard(){
  const [tt, setTt] = useState(null);

  useEffect(()=>{
    (async ()=>{
      const { data } = await api.get('/student/me/timetable');
      setTt(data);
    })();
  },[]);

  return (
    <div className="card">
      <h2>My Class Timetable</h2>
      {tt?.grid?.length ? (
        <table>
          <thead><tr><th>Day</th><th>Period</th><th>Course</th><th>Room</th></tr></thead>
          <tbody>
            {tt.grid.map((s,i)=>(
              <tr key={i}>
                <td>{['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s.day]}</td>
                <td>{s.period}</td>
                <td>{s.course?.code} {s.course?.name}</td>
                <td>{s.room?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="muted">No timetable found.</div>}
    </div>
  );
}
