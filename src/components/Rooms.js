import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../App.css";

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState("");
  const [editingRoom, setEditingRoom] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const decoded = jwtDecode(token);
    if (decoded.role !== "superadmin") {
      navigate("/");
      return;
    }

    const fetchRooms = async () => {
      try {
        const res = await axios.get("http://10.1.99.99:5000/rooms", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRooms(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to fetch rooms");
      }
    };

    fetchRooms();
  }, [navigate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return alert("Please login first");

    try {
      const res = await axios.post(
        "http://10.1.99.99:5000/rooms",
        { name: newRoomName, capacity: newRoomCapacity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Room created successfully!");
      setRooms([...rooms, res.data.room]);
      setNewRoomName("");
      setNewRoomCapacity("");
    } catch (err) {
      alert("Failed to create room: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setNewRoomName(room.name);
    setNewRoomCapacity(room.capacity);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return alert("Please login first");

    try {
      const res = await axios.put(
        `http://10.1.99.99:5000/rooms/${editingRoom.id}`,
        { name: newRoomName, capacity: newRoomCapacity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Room updated successfully!");
      setRooms(rooms.map((r) => (r.id === editingRoom.id ? res.data.room : r)));
      setEditingRoom(null);
      setNewRoomName("");
      setNewRoomCapacity("");
    } catch (err) {
      alert("Failed to update room: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (roomId) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please login first");

    if (!window.confirm("Are you sure you want to delete this room? All associated bookings will be deleted.")) return;

    try {
      await axios.delete(`http://10.1.99.99:5000/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Room deleted successfully!");
      setRooms(rooms.filter((room) => room.id !== roomId));
    } catch (err) {
      alert("Failed to delete room: " + (err.response?.data?.error || err.message));
    }
  };

  const cancelEdit = () => {
    setEditingRoom(null);
    setNewRoomName("");
    setNewRoomCapacity("");
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="rooms-container">
      <h2>Manage Meeting Rooms</h2>
      <div className="form-container">
        <h3>{editingRoom ? "Edit Room" : "Create New Room"}</h3>
        <form onSubmit={editingRoom ? handleUpdate : handleCreate}>
          <input
            type="text"
            placeholder="Room Name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Capacity"
            value={newRoomCapacity}
            onChange={(e) => setNewRoomCapacity(e.target.value)}
            required
            min="1"
          />
          <button type="submit" className="booking-btn">
            {editingRoom ? "Update Room" : "Create Room"}
          </button>
          {editingRoom && (
            <button type="button" className="cancel-btn" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </form>
      </div>
      <div className="rooms-list">
        <h3>Existing Rooms</h3>
        {rooms.length > 0 ? (
          <table className="rooms-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.id}</td>
                  <td>{room.name}</td>
                  <td>{room.capacity}</td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(room)}
                      title="Edit Room"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(room.id)}
                      title="Delete Room"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No rooms found.</p>
        )}
      </div>
    </div>
  );
}

export default Rooms;