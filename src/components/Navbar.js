import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../App.css";

function Navbar() {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  let username = null;
  let isSuperAdmin = false;

  if (token) {
    try {
      const decoded = jwtDecode(token);
      username = decoded.username;
      isSuperAdmin = decoded.role === "superadmin";
    } catch (err) {
      console.error("Invalid token:", err);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="nav-icons">
          <Link to="/" className="nav-icon home-icon" title="Home">
            🏠
          </Link>
          {isSuperAdmin && (
            <Link to="/users" className="nav-icon users-icon" title="Users">
              👥
            </Link>
          )}
          {isSuperAdmin && (
            <Link to="/rooms" className="nav-icon rooms-icon" title="Rooms">
              🏢 Rooms
            </Link>
          )}
        </div>
        <h1>Meeting Booker</h1>
      </div>
      <div className="nav-right">
        {token ? (
          <>
            <span className="user-profile">{username}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;