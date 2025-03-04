const express = require("express");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
const SECRET_KEY = "your_secret_key";

app.post("/register", async (req, res) => {
    const { email, password, username } = req.body; 
    try {
      const result = await pool.query(
        "INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING id",
        [email, password, username]
      );
      res.status(201).json({ message: "User registered", userId: result.rows[0].id });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1 AND password = $2", [email, password]);
      if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
      console.log("User data:", result.rows[0]); 
      const token = jwt.sign(
        { 
          id: result.rows[0].id, 
          username: result.rows[0].username, 
          role: result.rows[0].role 
        },
        SECRET_KEY,
        { expiresIn: "1h" }
      );
      res.json({ token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

app.get("/rooms", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM rooms");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/bookings", async (req, res) => {
    const { current } = req.query;
    try {
      let query =
        "SELECT b.*, r.name AS room_name, u.username AS booked_by " +
        "FROM bookings b " +
        "JOIN rooms r ON b.room_id = r.id " +
        "JOIN users u ON b.user_id = u.id " +
        "ORDER BY r.id, b.start_time";
      let params = [];
      if (current === "true") {
        const now = new Date().toISOString();
        query =
          "SELECT b.*, r.name AS room_name, u.username AS booked_by " +
          "FROM bookings b " +
          "JOIN rooms r ON b.room_id = r.id " +
          "JOIN users u ON b.user_id = u.id " +
          "WHERE b.start_time <= $1 AND b.end_time >= $1 " +
          "ORDER BY r.id, b.start_time";
        params = [now];
      }
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

app.post("/bookings", async (req, res) => {
  const { room_id, title, start_time, end_time } = req.body;
  const token = req.headers.authorization?.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);

    const conflictCheck = await pool.query(
      "SELECT 1 FROM bookings WHERE room_id = $1 AND (start_time < $3 AND end_time > $2)",
      [room_id, start_time, end_time]
    );
    if (conflictCheck.rows.length > 0) {
      return res.status(400).json({ error: "Room is already booked for this time slot" });
    }

    const result = await pool.query(
      "INSERT INTO bookings (user_id, room_id, title, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [decoded.id, room_id, title, start_time, end_time]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(401).json({ error: err.message || "Unauthorized" });
  }
});
app.delete("/bookings/:id", async (req, res) => {
    const { id } = req.params;
    const token = req.headers.authorization?.split(" ")[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      const result = await pool.query(
        "DELETE FROM bookings WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, decoded.id]
      );
      if (result.rows.length === 0) {
        return res.status(403).json({ error: "Booking not found or you don’t have permission to delete it" });
      }
      res.json({ message: "Booking deleted successfully", booking: result.rows[0] });
    } catch (err) {
      res.status(401).json({ error: err.message || "Unauthorized" });
    }
  });
  // Update booking (superadmin can edit any)
app.put("/bookings/:id", async (req, res) => {
    const { id } = req.params;
    const { room_id, title, start_time, end_time } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      let query = "UPDATE bookings SET room_id = $1, title = $2, start_time = $3, end_time = $4 WHERE id = $5 AND user_id = $6 RETURNING *";
      let params = [room_id, title, start_time, end_time, id, decoded.id];
      if (decoded.role === "superadmin") {
        query = "UPDATE bookings SET room_id = $1, title = $2, start_time = $3, end_time = $4 WHERE id = $5 RETURNING *";
        params = [room_id, title, start_time, end_time, id];
      }
  
      // Check for time conflicts (excluding the current booking)
      const conflictCheck = await pool.query(
        "SELECT 1 FROM bookings WHERE room_id = $1 AND (start_time < $3 AND end_time > $2) AND id != $4",
        [room_id, start_time, end_time, id]
      );
      if (conflictCheck.rows.length > 0) {
        return res.status(400).json({ error: "Room is already booked for this time slot" });
      }
  
      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        return res.status(403).json({ error: "Booking not found or you don’t have permission to edit it" });
      }
      res.json({ message: "Booking updated successfully", booking: result.rows[0] });
    } catch (err) {
      res.status(401).json({ error: err.message || "Unauthorized" });
    }
  });
  
  // Delete booking (superadmin can delete any)
  app.delete("/bookings/:id", async (req, res) => {
    const { id } = req.params;
    const token = req.headers.authorization?.split(" ")[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      let query = "DELETE FROM bookings WHERE id = $1 AND user_id = $2 RETURNING *";
      let params = [id, decoded.id];
      if (decoded.role === "superadmin") {
        query = "DELETE FROM bookings WHERE id = $1 RETURNING *";
        params = [id];
      }
      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        return res.status(403).json({ error: "Booking not found or you don’t have permission to delete it" });
      }
      res.json({ message: "Booking deleted successfully", booking: result.rows[0] });
    } catch (err) {
      res.status(401).json({ error: err.message || "Unauthorized" });
    }
  });
  app.post("/rooms", async (req, res) => {
    const { name, capacity } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded.role !== "superadmin") {
        return res.status(403).json({ error: "Forbidden: Superadmin access required" });
      }
      const result = await pool.query(
        "INSERT INTO rooms (name, capacity) VALUES ($1, $2) RETURNING *",
        [name, parseInt(capacity)]
      );
      res.status(201).json({ message: "Room created successfully", room: result.rows[0] });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  
  // Update a room (superadmin only)
  app.put("/rooms/:id", async (req, res) => {
    const { id } = req.params;
    const { name, capacity } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded.role !== "superadmin") {
        return res.status(403).json({ error: "Forbidden: Superadmin access required" });
      }
      const result = await pool.query(
        "UPDATE rooms SET name = $1, capacity = $2 WHERE id = $3 RETURNING *",
        [name, parseInt(capacity), id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json({ message: "Room updated successfully", room: result.rows[0] });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  
  // Delete a room (superadmin only)
  app.delete("/rooms/:id", async (req, res) => {
    const { id } = req.params;
    const token = req.headers.authorization?.split(" ")[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded.role !== "superadmin") {
        return res.status(403).json({ error: "Forbidden: Superadmin access required" });
      }
      // Delete associated bookings first due to foreign key constraint
      await pool.query("DELETE FROM bookings WHERE room_id = $1", [id]);
      const result = await pool.query("DELETE FROM rooms WHERE id = $1 RETURNING *", [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json({ message: "Room deleted successfully", room: result.rows[0] });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  
  // Get all users (superadmin only)
  app.get("/users", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded.role !== "superadmin") {
        return res.status(403).json({ error: "Forbidden: Superadmin access required" });
      }
      const result = await pool.query("SELECT id, username, email, role FROM users");
      res.json(result.rows);
    } catch (err) {
      res.status(401).json({ error: err.message || "Unauthorized" });
    }
  });
  
  // Delete user (superadmin only)
  app.delete("/users/:id", async (req, res) => {
    const { id } = req.params;
    const token = req.headers.authorization?.split(" ")[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded.role !== "superadmin") {
        return res.status(403).json({ error: "Forbidden: Superadmin access required" });
      }
      if (parseInt(id) === decoded.id) {
        return res.status(400).json({ error: "Superadmin cannot delete themselves" });
      }
  
      // Delete user's bookings first due to foreign key constraint
      await pool.query("DELETE FROM bookings WHERE user_id = $1", [id]);
      
      // Delete the user
      const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING *", [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ message: "User deleted successfully", user: result.rows[0] });
    } catch (err) {
      res.status(401).json({ error: err.message || "Unauthorized" });
    }
  });
  // Get all users (superadmin only)
app.get("/users", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded.role !== "superadmin") {
        return res.status(403).json({ error: "Forbidden: Superadmin access required" });
      }
      const result = await pool.query("SELECT id, username, email, role FROM users");
      res.json(result.rows);
    } catch (err) {
      res.status(401).json({ error: err.message || "Unauthorized" });
    }
  });

app.listen(5000, () => console.log("Server running on port 5000"));