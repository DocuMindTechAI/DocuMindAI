// src/components/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  // Hooks
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const username = user?.username;
  const dropdownRef = useRef(null);

  // Debug user state
  useEffect(() => {
    console.log("User state:", { token, user, username });
  }, [token, user, username]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Render null if not logged in
  if (!token) return null;

  // Logout handler
  const handleLogout = () => {
    logout(); // Panggil logout dari AuthContext
    navigate("/login", { replace: true });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Pagi";
    if (hour < 15) return "Siang";
    if (hour < 18) return "Sore";
    return "Malam";
  };

  return (
    <header className="fixed top-0 inset-x-0 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white shadow-lg z-50 px-6">
      <div className="flex justify-between h-16 items-center">
        {/* Logo */}
        <h1
          className="text-2xl font-extrabold cursor-pointer transition-transform hover:scale-105"
          onClick={() => navigate("/documents")}
        >
          DocuMindAI
        </h1>

        {/* Right side */}
        <div className="flex items-center space-x-6">
          {/* Profile dropdown (hidden on mobile) */}
          <div className="relative hidden md:block" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center space-x-2 px-3 py-2 rounded-full bg-neutral-800 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-500 transition-all duration-300 transform hover:scale-105"
            >
              <span className="material-icons text-2xl">account_circle</span>
              <span className="font-medium">
                {getGreeting()}, {username ? username : "Guest"}
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-100 transform opacity-0 translate-y-2 animate-dropdown z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <span className="block text-sm font-semibold text-gray-900">
                    {username ? username : "Guest"}
                  </span>
                </div>
                <NavLink
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="block w-full text-left px-4 py-3 text-sm hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-700 rounded-t-xl transition-colors duration-200"
                >
                  Profil Saya
                </NavLink>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 rounded-b-xl transition-colors duration-200"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-full hover:bg-neutral-700 transition-colors duration-200"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="material-icons text-2xl">menu</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-neutral-800 mt-2 mb-8 rounded-2xl shadow-lg transform opacity-0 translate-y-2 animate-slide-in">
          <nav className="px-3 pt-3 pb-4 space-y-2">
            <div className="px-3 py-2 text-sm font-semibold text-gray-300 border-b border-neutral-700">
              {getGreeting()}, {username ? username : "Guest"}
            </div>

            <NavLink
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="block w-full text-left px-4 py-3 text-sm rounded-lg text-gray-300 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-500 hover:text-white transition-all duration-200"
            >
              Profil Saya
            </NavLink>
            <button
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className="block w-full text-left px-4 py-3 text-sm rounded-lg text-gray-300 hover:bg-gradient-to-r hover:from-red-600 hover:to-red-500 hover:text-white transition-all duration-200"
            >
              Logout
            </button>
          </nav>
        </div>
      )}
      <style>{`
  @keyframes dropdown {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-dropdown {
    animation: dropdown 0.2s ease-out forwards;
  }
  @keyframes slide-in {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-slide-in {
    animation: slide-in 0.2s ease-out forwards;
  }
`}</style>
    </header>
  );
}
