// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./styles.css";

const BASE = import.meta.env.VITE_BACKEND_URL || ""; // Netlify env variable

export default function App() {
  // UI state
  const [running, setRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Idle");
  const [market, setMarket] = useState("R_75");
  const [mode, setMode] = useState("normal"); // normal | speed-countdown | speed-instant
  const [stake, setStake] = useState(1);
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [martingale, setMartingale] = useState(false);
  const [martMultiplier, setMartMultiplier] = useState(2);

  // Prediction + marker state
  const [predicted, setPredicted] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [logs, setLogs] = useState([]);

  // DOM refs for marker animation
  const containerRef = useRef(null);
  const cellRefs = useRef([]);
  const markerRef = useRef(null);

  // countdown interval ref
  const countdownRef = useRef(null);

  // helper to append logs
  const addLog = (text) => {
    setLogs((s) => [new Date().toLocaleTimeString() + " — " + text, ...s].slice(0, 200));
  };

  // --- Backend helpers ---
  const api = axios.create({ baseURL: BASE, headers: { "Content-Type": "application/json" }, timeout: 15000 });

  async function fetchStatus() {
    try {
      const r = await api.get("/status");
      if (r?.data?.running) setRunning(true);
      if (r?.data?.prediction) {
        const p = r.data.prediction;
        setPredicted(p.digit ?? null);
        setConfidence(p.confidence ?? null);
        addLog("Status prediction from backend: " + JSON.stringify(p));
      }
    } catch (err) {
      addLog("Status fetch failed: " + (err?.message || err));
    }
  }

  useEffect(() => {
    fetchStatus();
    // poll status every 6s to update the UI
    const id = setInterval(fetchStatus, 6000);
    return () => clearInterval(id);
  }, []);

  // --- Marker animation ---
  // compute and move marker to the predicted cell
  useEffect(() => {
    if (predicted === null || !containerRef.current || !cellRefs.current[predicted]) {
      // hide marker
      if (markerRef.current) markerRef.current.style.opacity = 0;
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const targetRect = cellRefs.current[predicted].getBoundingClientRect();
    const left = targetRect.left - containerRect.left + targetRect.width / 2;
    const top = targetRect.top - containerRect.top + targetRect.height / 2;
    const m = markerRef.current;
    if (m) {
      m.style.opacity = 1;
      // translate marker using transform for smooth animation
      m.style.transform = `translate(${left}px, ${top}px) translate(-50%, -50%)`;
    }
  }, [predicted]);

  // --- Countdown logic ---
  function clearCountdown() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    setCountdown(null);
  }

  function startLocalCountdown(seconds = 10, digit = null, autoAtEnd = false) {
    clearCountdown();
    setCountdown(seconds);
    addLog(`Countdown started ${seconds}s for digit ${digit}`);
    let s = seconds;
    countdownRef.current = setInterval(() => {
      s -= 1;
      setCountdown(s);
      if (s <= 0) {
        clearCountdown();
        if (autoAtEnd) {
          addLog("Countdown ended → auto placing trade");
          placeTrade({ digit, auto: true });
        } else {
          addLog("Countdown ended → manual placement available");
        }
      }
    }, 1000);
  }

  // --- Prediction request ---
  async function requestPrediction() {
    addLog("Requesting prediction...");
    // try dedicated endpoint first
    try {
      const res = await api.post("/request_prediction", { market });
      if (res?.data) {
        const p = res.data;
        setPredicted(p.predicted_digit ?? p.digit ?? null);
        setConfidence(p.confidence ?? null);
        addLog("Prediction received: " + JSON.stringify(p));
        // handle mode behavior
        if (mode === "speed-instant") {
          // immediate trade
          placeTrade({ digit: p.predicted_digit ?? p.digit, auto: true });
        } else {
          const windowSec = p.trade_window_seconds ?? 10;
          startLocalCountdown(windowSec, p.predicted_digit ?? p.digit, mode === "speed-countdown");
        }
        return;
      }
    } catch (err) {
      addLog("Prediction endpoint failed; falling back to status/pseudo: " + (err?.message || err));
    }

    // fallback: try /status prediction
    try {
      const st = await api.get("/status");
      if (st?.data?.prediction) {
        const p = st.data.prediction;
        setPredicted(p.digit ?? null);
        setConfidence(p.confidence ?? null);
        addLog("Prediction from /status: " + JSON.stringify(p));
        if (mode === "speed-instant") {
          placeTrade({ digit: p.digit, auto: true });
        } else {
          startLocalCountdown(p.trade_window_seconds ?? 10, p.digit, mode === "speed-countdown");
        }
        return;
      }
    } catch (err) {
      addLog("Status fallback failed: " + (err?.message || err));
    }

    // last resort: local random prediction (for UI/testing)
    const randomDigit = Math.floor(Math.random() * 10);
    setPredicted(randomDigit);
    setConfidence(0.6);
    addLog("Fallback random prediction: " + randomDigit);
    if (mode === "speed-instant") {
      placeTrade({ digit: randomDigit, auto: true });
    } else {
      startLocalCountdown(10, randomDigit, mode === "speed-countdown");
    }
  }

  // --- Place trade (manual or auto) ---
  async function placeTrade({ digit, auto = false }) {
    if (digit === null || digit === undefined) {
      addLog("No digit to place trade on.");
      return;
    }
    addLog(`Placing trade for digit ${digit} (auto=${auto})`);
    try {
      const payload = {
        market,
        digit,
        stake: Number(stake) || 1,
        tp: tp ? Number(tp) : null,
        sl: sl ? Number(sl) : null,
        martingale: martingale ? { enabled: true, multiplier: Number(martMultiplier) || 2 } : { enabled: false },
        mode: auto ? "auto" : "manual",
      };
      const res = await api.post("/place_trade", payload);
      addLog("Place trade response: " + JSON.stringify(res.data));
    } catch (err) {
      addLog("Place trade failed: " + (err?.message || err));
    }
  }

  // --- Start / Stop server bot (optional) ---
  async function startServerBot() {
    try {
      setStatusMsg("Starting...");
      const r = await api.post("/start", { market, stake, tp, sl, martingale: martingale ? { enabled: true, multiplier: martMultiplier } : { enabled: false }, mode });
      setStatusMsg(r.data?.message ?? "Started");
      setRunning(true);
      addLog("Server bot start result: " + JSON.stringify(r.data));
    } catch (err) {
      setStatusMsg("Start failed");
      addLog("Start error: " + (err?.message || err));
    }
  }

  async function stopServerBot() {
    try {
      setStatusMsg("Stopping...");
      const r = await api.post("/stop");
      setStatusMsg(r.data?.message ?? "Stopped");
      setRunning(false);
      addLog("Server bot stopped: " + JSON.stringify(r.data));
      clearCountdown();
    } catch (err) {
      setStatusMsg("Stop failed");
      addLog("Stop error: " + (err?.message || err));
    }
  }

  // --- UI render ---
  const digits = Array.from({ length: 10 }).map((_, i) => i);

  // helper to set cell refs
  const setCellRef = (el, i) => {
    cellRefs.current[i] = el;
  };

  return (
    <div className="page">
      <header className="topbar">
        <h1>ASTARK — SpeedBot</h1>
        <div className="status">
          <div className="small">Status: {statusMsg}</div>
          <div className={`dot ${running ? "on" : "off"}`}>{running ? "● Running" : "● Idle"}</div>
        </div>
      </header>

      <main className="container">
        <section className="card">
          <label>Market</label>
          <select value={market} onChange={(e) => setMarket(e.target.value)}>
            <option value="R_10">Volatility 10</option>
            <option value="R_25">Volatility 25</option>
            <option value="R_50">Volatility 50</option>
            <option value="R_75">Volatility 75</option>
            <option value="R_100">Volatility 100</option>
          </select>
        </section>

        <section className="card">
          <label>Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="normal">Normal (manual, 10s)</option>
            <option value="speed-countdown">Speed (countdown → auto)</option>
            <option value="speed-instant">Speed (instant → auto)</option>
          </select>
        </section>

        <section className="card">
          <label>Stake ($)</label>
          <input type="number" value={stake} onChange={(e) => setStake(e.target.value)} />
          <div className="row">
            <label><input type="checkbox" checked={martingale} onChange={(e) => setMartingale(e.target.checked)} /> Martingale</label>
            <input type="number" value={martMultiplier} onChange={(e) => setMartMultiplier(e.target.value)} style={{ width: 90 }} />
          </div>
          <div className="row">
            <input placeholder="Take Profit ($)" value={tp} onChange={(e) => setTp(e.target.value)} />
            <input placeholder="Stop Loss ($)" value={sl} onChange={(e) => setSl(e.target.value)} />
          </div>
        </section>

        <section className="card">
          <label>Digit Prediction</label>
          <div className="pred-row">
            <div className="pred-digit">{predicted ?? "—"}</div>
            <div className="pred-conf">{confidence ? Math.round(confidence * 100) + "%" : ""}</div>
          </div>

          <div className="digit-board-wrapper" ref={containerRef}>
            <div className="digit-board">
              {digits.map((d) => (
                <div key={d} ref={(el) => setCellRef(el, d)} className={`digit-cell ${predicted === d ? "predicted" : ""}`}>
                  {d}
                </div>
              ))}
            </div>
            <div ref={markerRef} className="marker" style={{ opacity: 0, transform: "translate(-50%,-50%)" }} />
          </div>

          {mode !== "speed-instant" && <div className="countdown">Countdown: <strong>{countdown === null ? "—" : `${countdown}s`}</strong></div>}

          <div className="controls">
            <button className="btn" onClick={requestPrediction}>Request Prediction</button>
            <button className="btn" onClick={() => placeTrade({ digit: predicted, auto: false })}>Place Trade Now</button>
            <button className="btn alt" onClick={() => { setPredicted(null); clearCountdown(); }}>Clear</button>
          </div>
        </section>

        <section className="card controls">
          <button className="btn big" onClick={startServerBot} disabled={running}>Start Bot</button>
          <button className="btn big danger" onClick={stopServerBot} disabled={!running}>Stop Bot</button>
        </section>

        <section className="card logs">
          <label>Logs</label>
          <div className="logbox">
            {logs.length === 0 && <div className="small">No logs yet</div>}
            {logs.map((l, i) => <div key={i} className="log">{l}</div>)}
          </div>
        </section>
      </main>
    </div>
  );
               }
