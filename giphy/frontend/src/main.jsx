// main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Find the root element in the HTML
const rootElement = document.getElementById("root");

// Create the root using the new API
const root = createRoot(rootElement);

// Use the new root to render your application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
