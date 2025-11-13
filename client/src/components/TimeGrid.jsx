import React from 'react';

export default function TimeGrid({ days, periods, renderCell }){
  return (
    <div className="card" style={{overflowX:'auto'}}>
      <table>
        <thead>
          <tr>
            <th>Day/Period</th>
            {Array.from({length: periods}, (_,i)=>i+1).map(p=> (
              <th key={p}>{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(d => (
            <tr key={d}>
              <td style={{fontWeight:'600'}}>{['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]}</td>
              {Array.from({length: periods}, (_,i)=>i+1).map(p=> (
                <td key={p}>{renderCell?.(d,p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
