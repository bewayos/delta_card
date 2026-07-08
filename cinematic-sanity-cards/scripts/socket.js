import { MODULE_ID, CardStore } from "./card-store.js";
import { PlayerOverlay } from "./player-overlay.js";

const SOCKET_NAME = `module.${MODULE_ID}`;

export function registerSocket() {
  game.socket.on(SOCKET_NAME, (payload) => {
    if (!payload?.action) return;
    if (!game.users?.get(payload.senderId)?.isGM) return;
    if (payload.action === "showCard") {
      if (payload.targetUserId !== game.user?.id) return;
      PlayerOverlay.show(payload.card, payload.folder ?? null, CardStore.getOptions());
      return;
    }
    if (payload.action === "showVideo") {
      if (!Array.isArray(payload.targetUsers) || !payload.targetUsers.includes(game.user?.id)) return;
      PlayerOverlay.showVideo({
        videoId: payload.videoId,
        autoplay: payload.autoplay,
        controls: payload.controls,
        allowClose: payload.allowClose,
        displayMode: payload.displayMode
      });
    }
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
  game.socket.emit(SOCKET_NAME, { action: "showCard", senderId: game.user.id, targetUserId, cardId: card.id, card, folder, revealMode });
  if (targetUserId === game.user.id) PlayerOverlay.show(card, folder, CardStore.getOptions());
  return true;
}

export function sendVideoReveal({ targetUsers = [], videoId, autoplay = true, controls = false, allowClose = true, displayMode = "clean" }) {
  if (!game.user?.isGM) {
    ui.notifications.warn("Only a GM can send Cinematic Sanity Cards videos.");
    return false;
  }
  const recipients = Array.from(new Set(targetUsers)).filter((userId) => game.users?.get(userId));
  if (!recipients.length) {
    ui.notifications.warn("Choose at least one video recipient.");
    return false;
  }
  if (!videoId) {
    ui.notifications.warn("Enter a valid YouTube URL.");
    return false;
  }
  game.socket.emit(SOCKET_NAME, {
    action: "showVideo",
    senderId: game.user.id,
    targetUsers: recipients,
    videoId,
    autoplay: Boolean(autoplay),
    controls: Boolean(controls),
    allowClose: Boolean(allowClose),
    displayMode: displayMode === "crt" ? "crt" : "clean"
  });
  if (recipients.includes(game.user.id)) PlayerOverlay.showVideo({ videoId, autoplay, controls, allowClose, displayMode });
  return true;
}
