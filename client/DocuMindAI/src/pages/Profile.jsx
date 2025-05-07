import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import httpClient from "../utils/httpClient";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  // Hooks
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    phoneNumber: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async (retryCount = 2) => {
      try {
        const response = await httpClient.get("auth/me", {
          timeout: 5000, // 5-second timeout
        });
        console.log("User data response:", response.data);
        setFormData({
          username: response.data.username || "",
          email: response.data.email || "",
          phoneNumber: response.data.phoneNumber || "",
        });
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch user data:", err);
        if (err.response?.status === 401) {
          setError("Sesi tidak valid. Silakan login kembali.");
          logout(); // Panggil logout dari context
          navigate("/login", { replace: true });
        } else if (err.code === "ECONNABORTED") {
          setError("Permintaan timeout. Silakan cek koneksi Anda.");
        } else if (retryCount > 0) {
          setTimeout(() => fetchUserData(retryCount - 1), 1000);
          return;
        } else {
          setError(
            err.response?.data?.message ||
              "Gagal memuat data profil. Silakan coba lagi."
          );
        }
        setLoading(false);
      }
    };

    if (token) {
      fetchUserData();
    } else {
      setError("Tidak ada token. Silakan login.");
      navigate("/login", { replace: true });
    }
  }, [token, navigate, logout]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await httpClient.put(
        "auth/profile",
        {
          username: formData.username,
          phoneNumber: formData.phoneNumber,
        },
        {
          timeout: 5000,
        }
      );
      console.log("Update profile response:", response.data);
      setSuccess("Profil berhasil diperbarui!");
    } catch (err) {
      console.error("Failed to update profile:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(
        err.response?.data?.message ||
          "Gagal memperbarui profil. Silakan coba lagi."
      );
    }
  };

  // Logout handler
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <h2 className="text-3xl font-extrabold text-center text-gray-900">
          Profil Saya
        </h2>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
            {success}
          </div>
        )}
        <div className="space-y-4">
          {/* Profile Display */}
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 rounded-lg">
            <span className="material-icons text-4xl text-blue-600">
              account_circle
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {formData.username || "Guest"}
              </h3>
              <p className="text-sm text-gray-600">{formData.email}</p>
            </div>
          </div>

          {/* Update Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Nama Pengguna
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Masukkan nama pengguna"
                required
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Nomor Telepon
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Masukkan nomor telepon"
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 rounded-lg bg-blue-600 hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-400 text-white font-medium transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Simpan Perubahan
            </button>
          </form>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-2 px-4 rounded-lg bg-red-600 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-400 text-white font-medium transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
