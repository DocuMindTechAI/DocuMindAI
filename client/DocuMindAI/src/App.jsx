// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import ListDocumentPage from "./pages/ListDocumentPage";
import DetailDocumentPage from "./pages/DetailDocumentPage";
import Profile from "./pages/Profile";
import AppLayout from "./components/AppLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public (anonymous) */}
        <Route element={<ProtectedRoute anonymous />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected (needs login) */}
        <Route element={<ProtectedRoute />}>
          {/* Routes within AppLayout use Sidebar */}
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/documents" replace />} />
            <Route path="/documents" element={<ListDocumentPage />} />
            <Route path="/documents/:id" element={<DetailDocumentPage />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
