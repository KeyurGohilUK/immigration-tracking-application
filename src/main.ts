import { renderApp } from "./app/app";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Application root was not found.");
}

renderApp(root);
