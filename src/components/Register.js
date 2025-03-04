// import React, { useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import "../App.css"; // Import App.css

// function Register() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await axios.post("http://10.1.99.99:5000/register", { email, password });
//       alert("Registration successful! Please log in.");
//       navigate("/login");
//     } catch (err) {
//       alert("Registration failed: " + (err.response?.data?.error || "Unknown error"));
//     }
//   };

//   return (
//     <div className="form-container">
//       <h2>Sign Up</h2>
//       <form onSubmit={handleSubmit}>
//         <input
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//         />
//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//         />
//         <button type="submit" className="register-btn">
//           Register
//         </button>
//       </form>
//     </div>
//   );
// }

// export default Register;
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../App.css";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // New state for username
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://10.1.99.99:5000/register", { email, password, username });
      alert("Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      alert("Registration failed: " + (err.response?.data?.error || "Unknown error"));
    }
  };

  return (
    <div className="form-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="register-btn">
          Register
        </button>
      </form>
    </div>
  );
}

export default Register;