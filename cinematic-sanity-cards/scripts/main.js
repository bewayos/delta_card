import { MODULE_ID, registerSettings } from "./card-store.js";
import { CinematicSanityCardsPanel } from "./gm-panel.js";
import { registerSocket } from "./socket.js";

let panel;

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  registerSocket();
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user?.isGM) return;
  const tokenControls = controls.tokens ?? controls.find?.((control) => control.name === "tokens");
  const tool = {
    name: MODULE_ID,
    title: "Cinematic Sanity Cards",
    icon: "fa-solid fa-id-card",
    button: true,
    onClick: () => openCinematicSanityCardsPanel()
  };
  if (Array.isArray(tokenControls?.tools)) tokenControls.tools.push(tool);
});

Hooks.on("renderSettings", (app, html) => {
  if (!game.user?.isGM) return;

  const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
  if (!root) return;

  const settingsSection =
    root.querySelector("#settings-game") ??
    root.querySelector("[data-tab='settings']") ??
    root.querySelector(".settings-sidebar") ??
    root;

  if (settingsSection.querySelector(`[data-action='${MODULE_ID}-open-panel']`)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = `${MODULE_ID}-open-panel`;
  button.innerHTML = '<i class="fas fa-id-card"></i> Cinematic Sanity Cards';
  button.addEventListener("click", () => openCinematicSanityCardsPanel());

  settingsSection.appendChild(button);
});

export function openCinematicSanityCardsPanel() {
  panel ??= new CinematicSanityCardsPanel();
  panel.render({ force: true });
}
