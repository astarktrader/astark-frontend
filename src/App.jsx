import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import api from "./api";

const socket = io(import.meta.env.VITE_BACKEND_URL);

export default function App() {
  const [digit, setDigit] = useState(null);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    socket.on("tick", (data) => setDigit(data));
    socket.on("prediction", (p) => setPrediction(p));
    return () => {
      socket.off("tick");
      socket.off("prediction");
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-black text-white">
      <h1 className="text-3xl font-bold mb-6">Astark SpeedBot</h1>
      <div className="bg-gray-900 p-6 rounded-2xl shadow-xl w-80 text-center">
        <motion.div
          className="text-7xl font-bold mb-4"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          {digit !== null ? digit : "-"}
        </motion.div>
        <p className="text-lg">
          Prediction:{" "}
          <span className="font-bold text-green-400">
            {prediction !== null ? prediction : "Loading..."}
          </span>
        </p>
      </div>
    </div>
  );
}
