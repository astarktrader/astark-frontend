import React, { useState } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL);

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [digitMarker, setDigitMarker] = useState("");
  const [market, setMarket] = useState("matches");
  const [logs, setLogs] = useState([]);

  const startBot = () => {
    if (!digitMarker) {
      alert("Please set a Digit Prediction Marker before starting!");
      return;
    }

    socket.emit("start_bot", { digit: digitMarker, market });
    setIsRunning(true);
    setLogs((prev) => [
      ...prev,
      `🚀 Bot started on ${market.toUpperCase()} with Digit ${digitMarker}`,
    ]);
  };

  const stopBot = () => {
    socket.emit("stop_bot");
    setIsRunning(false);
    setLogs((prev) => [...prev, "🛑 Bot stopped"]);
  };

  return (
    <div className="container">
      <h1>ASTARK Speedbot 🚀</h1>

      <label>Choose Market:</label>
      <select
        value={market}
        onChange={(e) => setMarket(e.target.value)}
        disabled={isRunning}
      >
        <option value="matches">Matches / Differs</option>
        <option value="evenodd">Even / Odd</option>
        <option value="risefall">Rise / Fall</option>
        <option value="overunder">Over / Under</option>
      </select>

      <label>Digit Prediction Marker:</label>
      <input
        type="number"
        min="0"
        max="9"
        value={digitMarker}
        onChange={(e) => setDigitMarker(e.target.value)}
        placeholder="Enter digit 0-9"
        disabled={isRunning}
      />

      <div style={{ marginTop: "1rem" }}>
        <button onClick={startBot} disabled={isRunning}>
          ▶️ Start Bot
        </button>
        <button onClick={stopBot} disabled={!isRunning}>
          ⏹ Stop Bot
        </button>
      </div>

      <h3 style={{ marginTop: "1.5rem" }}>📊 Trade Logs</h3>
      <div
        style={{
          background: "#10141d",
          padding: "12px",
          borderRadius: "8px",
          minHeight: "150px",
          maxHeight: "200px",
          overflowY: "auto",
          fontFamily: "monospace",
          fontSize: "14px",
        }}
      >
        {logs.map((log, i) => (
          <p key={i}>{log}</p>
        ))}
      </div>
    </div>
  );
}
