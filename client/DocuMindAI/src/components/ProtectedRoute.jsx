// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ anonymous = false }) {
  const { token } = useAuth();

  if (anonymous) {
    // untuk route login: kalau sudah punya token, lempar ke public-documents
    return token ? <Navigate to="/documents" replace /> : <Outlet />;
  }
  // untuk route protected: kalau belum login, lempar ke login
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
