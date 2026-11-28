import React from "react";
import { createRoot } from "react-dom/client";
import { LabApp } from "./components/lab-app";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Physics lab root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <LabApp />
  </React.StrictMode>,
);
