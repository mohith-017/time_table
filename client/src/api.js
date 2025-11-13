// client/src/api.js
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:4000/api", // <- use port 4000 (your server)
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
