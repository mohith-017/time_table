// client/src/pages/Dashboard.jsx
import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import AdminImg from '../assets/admin.svg';
import TeacherImg from '../assets/teacher.svg';
import StudentImg from '../assets/student.svg';

export default function Dashboard() {
  const { user, loading } = useAuth();

  // AFTER LOGIN: redirect users to their role dashboard
  if (!loading && user) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />;
    if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
  }

  const Card = ({ img, title, desc, loginTo, signupTo, adminOnly }) => (
    <article className={`role ${title.toLowerCase()} card`} aria-label={title} style={{display:'flex', alignItems:'center', gap:12}}>
      <img src={img} alt={title} style={{width:100, height:100, objectFit:'contain'}} />
      <div style={{flex:1}}>
        <h3 style={{margin:'0 0 6px 0'}}>{title}</h3>
        <p className="muted" style={{margin:0}}>{desc}</p>
        <div style={{marginTop:12, display:'flex', gap:8}}>
          <Link className="btn" to={loginTo}>Login</Link>
          {!adminOnly && <Link className="btn gray" to={signupTo}>Sign Up</Link>}
        </div>
      </div>
    </article>
  );

  return (
    <div className="container" style={{paddingTop:28}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <div>
          <h1 style={{margin:0}}>Class Timetable Automation</h1>
          <p className="muted" style={{marginTop:6}}>Choose your role to login or sign up below.</p>
        </div>
      </div>

      <section className="role-cards" style={{ marginTop: 18 }}>
        <Card
          img={AdminImg}
          title="Admin"
          desc="Manage rooms, courses, teachers and generate timetables."
          loginTo="/login?role=ADMIN"
          signupTo="/signup?role=ADMIN"
          adminOnly={true}
        />

        <Card
          img={TeacherImg}
          title="Teacher"
          desc="Sign up or login to set unavailability and check your schedule."
          loginTo="/login?role=TEACHER"
          signupTo="/signup?role=TEACHER"
        />

        <Card
          img={StudentImg}
          title="Student"
          desc="Sign up to view your class timetable and stay updated."
          loginTo="/login?role=STUDENT"
          signupTo="/signup?role=STUDENT"
        />
      </section>

      <footer style={{ textAlign:'center', marginTop:36 }}>
        <p className="muted">© 2024 Class Timetable Automation. All rights reserved.</p>
      </footer>
    </div>
  );
}