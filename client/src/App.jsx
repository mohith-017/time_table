// client/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import TimetablePage from "./pages/TimetablePage.jsx";

import AdminDashboard from "./pages/AdminDashboard.jsx";
import TeachersAdmin from "./pages/TeachersAdmin.jsx";
import RoomsPage from "./pages/RoomsPage.jsx";
import CoursesPage from "./pages/CoursesPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <div>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected timetable — users must be logged in */}
          <Route path="/timetable" element={
            <ProtectedRoute>
              <TimetablePage />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/teachers" element={<TeachersAdmin />} />
          <Route path="/admin/rooms" element={<RoomsPage />} />
          <Route path="/admin/courses" element={<CoursesPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />

          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/student" element={<StudentDashboard />} />
        </Routes>
      </main>
    </div>
  );
}
