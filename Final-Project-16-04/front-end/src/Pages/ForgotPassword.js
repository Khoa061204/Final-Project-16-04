import React, { useState } from "react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await fetch("http://localhost:5000/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      setMessage("Check your email for the password reset link.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h2 className="text-3xl font-bold mb-4">Forgot Password</h2>
      {error && <p className="text-red-500">{error}</p>}
      {message && <p className="text-green-500">{message}</p>}
      <form onSubmit={handleReset} className="flex flex-col space-y-4">
        <input
          type="email"
          placeholder="Enter your email"
          className="p-3 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Reset Password
        </button>
      </form>
      <p className="mt-4">
        <a href="/login" className="text-blue-500 hover:underline">
          Back to Login
        </a>
      </p>
    </div>
  );
};

export default ForgotPassword;
