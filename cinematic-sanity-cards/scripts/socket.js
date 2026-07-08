import { MODULE_ID, CardStore } from "./card-store.js";
import { PlayerOverlay } from "./player-overlay.js";

const SOCKET_NAME = `module.${MODULE_ID}`;

export function registerSocket() {
  game.socket.on(SOCKET_NAME, (payload) => {
    if (payload?.action !== "showCard") return;
    if (payload.targetUserId !== game.user?.id) return;
    PlayerOverlay.show(payload.card, payload.folder ?? null, CardStore.getOptions());
  });
}

export function sendCardReveal({ targetUserId, card, folder = null, revealMode = "totem" }) {
  if (!game.user?.isGM) {
    ui.notifications.warn("Only a GM can send Cinematic Sanity Cards.");
    return false;
  }
  if (!targetUserId || !game.users?.get(targetUserId)) {
    ui.notifications.warn("Choose a valid target player.");
    return false;
  }
  if (!card?.id || !card?.image) {
    ui.notifications.warn("Choose a valid card with an image.");
    return false;
  }
  game.socket.emit(SOCKET_NAME, { action: "showCard", targetUserId, card, folder, revealMode });
  if (targetUserId === game.user.id) PlayerOverlay.show(card, folder, CardStore.getOptions());
  return true;
}
