import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./styles/perspective.css";
import "./styles/refinement.css";
import "./styles/connected.css";
import "./styles/polish.css";
import "./styles/interactions.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
