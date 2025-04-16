import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message);
      }

      alert("Login successful!");
      navigate("/home"); // Redirect to Home page
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h2 className="text-3xl font-bold mb-4">Login</h2>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleLogin} className="flex flex-col space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="p-3 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="p-3 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Login
        </button>
      </form>

      {/* Register Link */}
      <p className="mt-4">
        Don't have an account?{" "}
        <a href="/register" className="text-blue-500 hover:underline">
          Register here
        </a>
      </p>

      {/* Forgot Password Button */}
      <p className="mt-2">
        <a href="/forgot-password" className="text-blue-500 hover:underline">
          Forgot Password?
        </a>
      </p>
    </div>
  );
};

export default Login;
