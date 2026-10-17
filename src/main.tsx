import { render } from "preact";
import { DataError, loadGameData } from "./data/load.ts";
import { rawData } from "./data/raw-vite.ts";
import { App } from "./ui/app.tsx";
import "./ui/theme.css";

const root = document.getElementById("app")!;

try {
  render(<App data={loadGameData(rawData)} />, root);
} catch (error) {
  const issues = error instanceof DataError ? error.issues : [String(error)];
  root.textContent = `Game data error:\n${issues.join("\n")}`;
  root.style.whiteSpace = "pre-wrap";
  root.style.padding = "16px";
}
