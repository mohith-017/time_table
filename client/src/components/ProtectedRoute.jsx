import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ allowRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container">Checking session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowRoles && !allowRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
