// src/api.js
import { io } from "socket.io-client";

// Initialize the Socket.io client
const socket = io(import.meta.env.VITE_BACKEND_URL);

/**
 * Subscribe to a backend event
 * @param {string} event - Event name from backend
 * @param {function} callback - Function to call when event received
 */
export const subscribe = (event, callback) => {
  socket.on(event, callback);
};

/**
 * Unsubscribe from a backend event
 * @param {string} event - Event name
 * @param {function} callback - Function previously registered
 */
export const unsubscribe = (event, callback) => {
  socket.off(event, callback);
};

/**
 * Emit an event to the backend
 * @param {string} event - Event name
 * @param {any} data - Data to send
 */
export const emit = (event, data) => {
  socket.emit(event, data);
};

/**
 * Example fetch helper if you want REST API calls
 * @param {string} endpoint - API endpoint
 */
export const fetchData = async (endpoint) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error("API fetch error:", err);
    return null;
  }
};

export default {
  subscribe,
  unsubscribe,
  emit,
  fetchData,
};
