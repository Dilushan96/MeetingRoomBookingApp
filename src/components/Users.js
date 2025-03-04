import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../App.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      setCurrentUserId(decoded.id);
    } catch (err) {
      console.error("Invalid token:", err);
      navigate("/login");
      return;
    }

    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://10.1.99.99:5000/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to fetch users");
        if (err.response?.status === 403) navigate("/");
      }
    };

    fetchUsers();
  }, [navigate]);

  const handleDelete = async (userId) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please login first");

    if (!window.confirm("Are you sure you want to delete this user? All their bookings will also be deleted.")) return;

    try {
      await axios.delete(`http://10.1.99.99:5000/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("User deleted successfully!");
      setUsers(users.filter((user) => user.id !== userId));
    } catch (err) {
      alert("Deletion failed: " + (err.response?.data?.error || err.message));
    }
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="users-container">
      <h2>All Registered Users</h2>
      {users.length > 0 ? (
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  {user.id !== currentUserId && (
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(user.id)}
                      title="Delete User"
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No users found.</p>
      )}
    </div>
  );
}

export default Users;