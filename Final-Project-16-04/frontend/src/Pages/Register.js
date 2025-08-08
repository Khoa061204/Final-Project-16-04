import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = 'http://localhost:5000/api';

const Register = () => {
  // State variables to store user input (username, email, password) and error messages
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Hook for programmatic navigation

  // Function to handle user registration
  const handleRegister = async (e) => {
    e.preventDefault(); // Prevents default form submission behavior
    setError(""); // Clear previous errors

    try {
      // Send registration request to the backend API
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json(); // Parse the JSON response
      if (!response.ok) {
        throw new Error(data.message); // Throw error if registration fails
      }

      alert("Registration successful! Please log in."); // Success message
      navigate("/login"); // Redirect user to login page
    } catch (err) {
      setError(err.message); // Display error message
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">Register</h2>
      
      {/* Display error message if registration fails */}
      {error && <p className="text-red-500 dark:text-red-400">{error}</p>}

      {/* Registration form */}
      <form onSubmit={handleRegister} className="flex flex-col space-y-4 w-full max-w-md">
        <input
          type="text"
          placeholder="Username"
          className="p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={username}
          onChange={(e) => setUsername(e.target.value)} // Update username state
        />
        <input
          type="email"
          placeholder="Email"
          className="p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={email}
          onChange={(e) => setEmail(e.target.value)} // Update email state
        />
        <input
          type="password"
          placeholder="Password"
          className="p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={password}
          onChange={(e) => setPassword(e.target.value)} // Update password state
        />
        <button type="submit" className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          Register
        </button>
      </form>

      {/* Link to navigate to login page */}
      <p className="mt-4 text-gray-600 dark:text-gray-400">
        Already have an account?{" "}
        <a href="/login" className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:underline">
          Login here
        </a>
      </p>
    </div>
  );
};

export default Register;
