import { MODULE_ID, registerSettings } from "./card-store.js";
import { CinematicSanityCardsPanel } from "./gm-panel.js";
import { registerSocket, sendCardReveal } from "./socket.js";

let panel;

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  registerSocket();
  game.cinematicSanity = {
    open: openCinematicSanityCardsPanel,
    show: sendCardReveal
  };
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user?.isGM) return;
  const tokenControls = controls.tokens ?? controls.find?.((control) => control.name === "tokens");
  if (!tokenControls) return;

  const tool = {
    name: MODULE_ID,
    title: "Cinematic Sanity Cards",
    icon: "fa-solid fa-id-card",
    order: Object.keys(tokenControls.tools ?? {}).length,
    button: true,
    visible: game.user?.isGM === true,
    onChange: () => openCinematicSanityCardsPanel(),
    onClick: () => openCinematicSanityCardsPanel()
  };

  if (Array.isArray(tokenControls.tools)) {
    const existingIndex = tokenControls.tools.findIndex((existingTool) => existingTool.name === MODULE_ID);
    if (existingIndex >= 0) tokenControls.tools.splice(existingIndex, 1, tool);
    else tokenControls.tools.push(tool);
    return;
  }

  tokenControls.tools ??= {};
  tokenControls.tools[MODULE_ID] = tool;
});

Hooks.on("renderSettings", (app, html) => {
  if (!game.user?.isGM) return;

  const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
  if (!root) return;

  const settingsSection =
    root.querySelector("#settings-game") ??
    root.querySelector("[data-tab='settings']") ??
    root.querySelector(".settings-sidebar");
  if (!settingsSection) return;

  for (const duplicateButton of settingsSection.querySelectorAll(`[data-action='${MODULE_ID}-open-panel']`)) {
    duplicateButton.remove();
  }

  const icon = document.createElement("i");
  icon.classList.add("fas", "fa-id-card");

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = `${MODULE_ID}-open-panel`;
  button.appendChild(icon);
  button.appendChild(document.createTextNode(" Cinematic Sanity Cards"));
  button.addEventListener("click", () => openCinematicSanityCardsPanel());

  settingsSection.appendChild(button);
});

export function openCinematicSanityCardsPanel() {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can open Cinematic Sanity Cards.");
    return;
  }
  panel ??= new CinematicSanityCardsPanel();
  panel.render({ force: true });
}
