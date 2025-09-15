import React, { useState, useEffect } from "react";
import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL; // from Netlify environment

export default function App() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Check bot status on load
  useEffect(() => {
    axios
      .get(`${backendUrl}/status`)
      .then((res) => setRunning(res.data.running))
      .catch(() => setMessage("⚠️ Cannot connect to backend"));
  }, []);

  const startBot = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${backendUrl}/start`);
      setMessage(res.data.message);
      setRunning(res.data.success);
    } catch (err) {
      setMessage("❌ Failed to start bot");
    }
    setLoading(false);
  };

  const stopBot = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${backendUrl}/stop`);
      setMessage(res.data.message);
      if (res.data.success) setRunning(false);
    } catch (err) {
      setMessage("❌ Failed to stop bot");
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "Arial", padding: "2rem", textAlign: "center" }}>
      <h1>⚡ ASTARK SpeedBot</h1>
      <p>Status: {running ? "🟢 Running" : "🔴 Stopped"}</p>

      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={startBot}
          disabled={running || loading}
          style={{
            padding: "10px 20px",
            margin: "5px",
            background: "green",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          {loading ? "⏳ Starting..." : "🚀 Start Bot"}
        </button>

        <button
          onClick={stopBot}
          disabled={!running || loading}
          style={{
            padding: "10px 20px",
            margin: "5px",
            background: "red",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          {loading ? "⏳ Stopping..." : "🛑 Stop Bot"}
        </button>
      </div>

      {message && <p style={{ marginTop: "1rem" }}>{message}</p>}
    </div>
  );
  }
