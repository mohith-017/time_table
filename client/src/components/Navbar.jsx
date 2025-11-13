// client/src/components/Navbar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
// import { useTheme } from "../theme/ThemeContext.jsx"; // Removed

export default function Navbar(){
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  // const { theme, toggle } = useTheme(); // Removed

  const doLogout = async () => {
    try {
      await logout();
      nav("/");
    } catch (e) {
      console.error("Logout failed", e);
      alert("Logout failed, please try again.");
    }
  };

  const linkStyle = (p) => ({
    color: pathname.startsWith(p) ? "var(--btn-bg)" : "var(--muted)",
    textDecoration: "none",
    padding: "6px 8px",
    borderRadius: 6
  });

  return (
    <header style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "transparent", padding: "10px 0" }}>
      <div className="container" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
        <div style={{display:'flex', alignItems:'center', gap:18}}>
          <Link to="/" style={{ color:'var(--text)', fontWeight:700, textDecoration:'none', fontSize:'1.1rem'}}>Timetable</Link>

          <nav style={{display:'flex', gap:6, alignItems:'center'}}>
            {/* Timetable link shown only when logged in */}
            {user && <Link to="/timetable" style={linkStyle("/timetable")}>Timetable</Link>}

            {/* Admin links shown only to admins */}
            {user?.role === 'ADMIN' && (
              <>
                <Link to="/admin" style={linkStyle("/admin")}>Admin</Link>
                <Link to="/admin/teachers" style={linkStyle("/admin/teachers")}>Teachers</Link>
                <Link to="/admin/rooms" style={linkStyle("/admin/rooms")}>Rooms</Link>
                <Link to="/admin/courses" style={linkStyle("/admin/courses")}>Courses</Link>
                <Link to="/admin/settings" style={linkStyle("/admin/settings")}>Settings</Link>
              </>
            )}
          </nav>
        </div>

        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          {/* Theme button removed */}

          {user ? (
            <>
              <span className="muted" style={{marginRight:8}}>{user.name} · {user.role}</span>
              <button className="btn red" onClick={doLogout} aria-label="Logout">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn gray" style={{ textDecoration: 'none' }}>Login</Link>
              <Link to="/signup" className="btn" style={{ textDecoration: 'none' }}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}