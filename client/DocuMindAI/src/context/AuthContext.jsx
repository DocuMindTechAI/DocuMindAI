import { createContext, useContext, useState, useEffect } from "react";
import httpClient from "../utils/httpClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    localStorage.getItem("access_token") || null
  );
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(
    !!localStorage.getItem("access_token")
  ); // Set to true if token exists

  // Fungsi untuk login
  const loginSuccess = ({ token, user }) => {
    setToken(token);
    setUser(user);
    localStorage.setItem("access_token", token);
    httpClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    setLoading(false);
  };

  // Fungsi untuk logout
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("access_token");
    delete httpClient.defaults.headers.common.Authorization;
    setLoading(false);
  };

  // Cek token saat aplikasi dimuat
  useEffect(() => {
    if (token) {
      httpClient.defaults.headers.common.Authorization = `Bearer ${token}`;
      setLoading(true);
      httpClient
        .get("/auth/me")
        .then(({ data }) => {
          setUser(data);
          setLoading(false);
        })
        .catch(() => {
          logout();
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ token, user, loginSuccess, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
