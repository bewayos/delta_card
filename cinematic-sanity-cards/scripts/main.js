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
  const button = $(`<button type="button"><i class="fas fa-id-card"></i> Cinematic Sanity Cards</button>`);
  button.on("click", () => openCinematicSanityCardsPanel());
  html.find("#settings-game").append(button);
});

export function openCinematicSanityCardsPanel() {
  panel ??= new CinematicSanityCardsPanel();
  panel.render({ force: true });
}
