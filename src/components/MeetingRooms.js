import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../App.css";

function MeetingRooms() {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [error, setError] = useState(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const roomsRes = await axios.get("http://10.1.99.99:5000/rooms");
      setRooms(roomsRes.data);
      const bookingsRes = await axios.get(`http://10.1.99.99:5000/bookings?current=${!showAllBookings}`);
      console.log("Fetched bookings:", bookingsRes.data.map(b => ({
        id: b.id,
        title: b.title,
        start_time: b.start_time,
        end_time: b.end_time,
        room_id: b.room_id
      })));
      setBookings(bookingsRes.data);
    } catch (err) {
      setError("Failed to fetch data: " + err.message);
    }
  }, [showAllBookings]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setIsSuperAdmin(decoded.role === "superadmin");
        setCurrentUserId(decoded.id);
      } catch (err) {
        console.error("Invalid token:", err);
      }
    }
    fetchData();
  }, [showAllBookings, fetchData]);

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
  };

  const isTimeSlotAvailable = (roomId, newStart, newEnd, excludeBookingId = null) => {
    const isAvailable = !bookings.some((b) => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      const overlap =
        b.room_id === roomId &&
        b.id !== excludeBookingId &&
        (start <= newEnd && end >= newStart);
      if (overlap) {
        console.log(`Overlap detected: Booking ${b.id} (${b.start_time} - ${b.end_time}) vs New (${newStart} - ${newEnd})`);
      }
      return overlap;
    });
    console.log("Time slot availability:", { roomId, newStart, newEnd, excludeBookingId, isAvailable });
    return isAvailable;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return alert("Please login first");
    if (!selectedRoom) return alert("Please select a room");
    if (!startTime || !endTime) return alert("Please select start and end times");

    const startTimeUTC = new Date(startTime.getTime() - (startTime.getTimezoneOffset() * 60000));
    const endTimeUTC = new Date(endTime.getTime() - (endTime.getTimezoneOffset() * 60000));
    const bookingData = {
      room_id: selectedRoom.id,
      title,
      start_time: startTimeUTC.toISOString(),
      end_time: endTimeUTC.toISOString()
    };
    console.log("Submitting booking:", {
      title,
      selectedStart: startTime.toLocaleString(),
      selectedEnd: endTime.toLocaleString(),
      utcStart: startTimeUTC.toISOString(),
      utcEnd: endTimeUTC.toISOString(),
      bookingData: bookingData
    });

    if (!isTimeSlotAvailable(selectedRoom.id, startTimeUTC, endTimeUTC)) {
      return alert("This room is already booked for this time slot.");
    }

    try {
      const response = await axios.post(
        "http://10.1.99.99:5000/bookings",
        bookingData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Backend response:", response.data);
      alert("Meeting booked successfully!");
      setTitle("");
      setStartTime(null);
      setEndTime(null);
      setSelectedRoom(null);
      await fetchData();
    } catch (err) {
      console.error("Booking error:", err.response?.data || err.message);
      alert("Booking failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (bookingId) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please login first");

    if (!window.confirm("Are you sure you want to delete this booking?")) return;

    try {
      await axios.delete(`http://10.1.99.99:5000/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Booking deleted successfully!");
      await fetchData();
    } catch (err) {
      alert("Deletion failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (booking) => {
    console.log("Editing booking:", {
      id: booking.id,
      title: booking.title,
      start_time: booking.start_time,
      end_time: booking.end_time,
      local_start: new Date(booking.start_time).toLocaleString(),
      local_end: new Date(booking.end_time).toLocaleString()
    });
    setEditingBooking(booking);
    setSelectedRoom(rooms.find((r) => r.id === booking.room_id));
    setTitle(booking.title);
    setStartTime(new Date(booking.start_time));
    setEndTime(new Date(booking.end_time));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return alert("Please login first");
    if (!selectedRoom) return alert("Please select a room");
    if (!startTime || !endTime) return alert("Please select start and end times");

    const startTimeUTC = new Date(startTime.getTime() - (startTime.getTimezoneOffset() * 60000));
    const endTimeUTC = new Date(endTime.getTime() - (endTime.getTimezoneOffset() * 60000));
    const bookingData = {
      room_id: selectedRoom.id,
      title,
      start_time: startTimeUTC.toISOString(),
      end_time: endTimeUTC.toISOString()
    };
    console.log("Updating booking:", {
      title,
      selectedStart: startTime.toLocaleString(),
      selectedEnd: endTime.toLocaleString(),
      utcStart: startTimeUTC.toISOString(),
      utcEnd: endTimeUTC.toISOString(),
      bookingData: bookingData
    });

    if (!isTimeSlotAvailable(selectedRoom.id, startTimeUTC, endTimeUTC, editingBooking.id)) {
      return alert("This room is already booked for this time slot.");
    }

    try {
      const response = await axios.put(
        `http://10.1.99.99:5000/bookings/${editingBooking.id}`,
        bookingData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Backend response:", response.data);
      alert("Meeting updated successfully!");
      setEditingBooking(null);
      setTitle("");
      setStartTime(null);
      setEndTime(null);
      setSelectedRoom(null);
      await fetchData();
    } catch (err) {
      console.error("Update error:", err.response?.data || err.message);
      alert("Update failed: " + (err.response?.data?.error || err.message));
    }
  };

  const cancelEdit = () => {
    setEditingBooking(null);
    setTitle("");
    setStartTime(null);
    setEndTime(null);
    setSelectedRoom(null);
  };

  const bookingsByRoom = rooms.reduce((acc, room) => {
    acc[room.name] = bookings.filter((b) => b.room_id === room.id);
    return acc;
  }, {});

  // Get current date and time for minTime calculation
  const today = new Date();
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="meeting-rooms-container">
      <h2>Meeting Rooms</h2>

      <div className="toggle-container">
        <button className="toggle-btn" onClick={() => setShowAllBookings(!showAllBookings)}>
          {showAllBookings ? "Show Current Bookings" : "Show All Bookings"}
        </button>
      </div>

      <div className="booked-rooms">
        <h3>{showAllBookings ? "All Bookings" : "Current Bookings"}</h3>
        {Object.keys(bookingsByRoom).map((roomName) => (
          <div key={roomName} className="room-bookings">
            <h4>{roomName}</h4>
            {bookingsByRoom[roomName].length > 0 ? (
              <ul>
                {bookingsByRoom[roomName].map((booking) => {
                  const now = new Date();
                  const isCurrent =
                    new Date(booking.start_time) <= now && new Date(booking.end_time) >= now;
                  const canEdit = isSuperAdmin || currentUserId === booking.user_id;
                  return (
                    <li key={booking.id} className={isCurrent ? "current-booking" : ""}>
                      <span className="booking-details">
                        {booking.title} (
                        {new Date(booking.start_time).toLocaleString()} -{" "}
                        {new Date(booking.end_time).toLocaleString()}
                        ) - Booked by: {booking.booked_by}
                        {isCurrent && <span className="current-badge">Ongoing</span>}
                      </span>
                      <div className="booking-actions">
                        {canEdit && (
                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(booking)}
                            title="Edit Booking"
                          >
                            ✏️
                          </button>
                        )}
                        {canEdit && (
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(booking.id)}
                            title="Delete Booking"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No {showAllBookings ? "bookings" : "current bookings"} for this room.</p>
            )}
          </div>
        ))}
      </div>

      <div className="room-selection">
        <h3>Select a Room</h3>
        <div className="room-list">
          {rooms.map((room) => {
            const isBookedNow = bookings.some(
              (b) =>
                b.room_id === room.id &&
                new Date(b.start_time) <= new Date() &&
                new Date(b.end_time) >= new Date()
            );
            return (
              <div
                key={room.id}
                className={`room-card ${selectedRoom?.id === room.id ? "selected" : ""} ${
                  isBookedNow ? "booked-now" : ""
                }`}
                onClick={() => handleRoomSelect(room)}
              >
                <h4>{room.name}</h4>
                <p>Capacity: {room.capacity}</p>
                {isBookedNow && <span className="booked-badge">Booked Now</span>}
              </div>
            );
          })}
        </div>
      </div>

      {selectedRoom && (
        <div className="form-container">
          <h3>{editingBooking ? `Edit Booking` : `Book ${selectedRoom.name}`}</h3>
          <form onSubmit={editingBooking ? handleUpdate : handleSubmit}>
            <input
              type="text"
              placeholder="Meeting Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <DatePicker
              selected={startTime}
              onChange={(date) => setStartTime(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              placeholderText="Start Time"
              className="date-picker-input"
              minDate={today} // Restrict to today and future dates
              minTime={isToday(startTime || today) ? today : new Date().setHours(0, 0, 0, 0)} // Today: current time, Future: midnight
              maxTime={new Date().setHours(23, 59, 59, 999)} // End of day
              required
            />
            <DatePicker
              selected={endTime}
              onChange={(date) => setEndTime(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              placeholderText="End Time"
              className="date-picker-input"
              minDate={today} // Restrict to today and future dates
              minTime={isToday(endTime || today) ? today : new Date().setHours(0, 0, 0, 0)} // Today: current time, Future: midnight
              maxTime={new Date().setHours(23, 59, 59, 999)} // End of day
              required
            />
            <button type="submit" className="booking-btn">
              {editingBooking ? "Update" : "Book Now"}
            </button>
            {editingBooking && (
              <button type="button" className="cancel-btn" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export default MeetingRooms;