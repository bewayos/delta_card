import { MODULE_ID } from "./card-store.js";

const OVERLAY_ID = `${MODULE_ID}-overlay`;
const ICON_ID = `${MODULE_ID}-collapsed`;
// No CRT frame PNG is currently present in the checked-in module assets; keep this
// constant as the single source of truth when the real asset is added.
const CRT_FRAME_PATH = "";
const CRT_SCREEN = Object.freeze({
  left: 13.5,
  top: 17.5,
  width: 67.5,
  height: 62.0
});

export class PlayerOverlay {
  static current = null;

  static show(card, folder, options = {}) {
    this.current = { card, folder, options };
    this.#removeOverlay();
    this.#removeIcon();
    this.#playSound(options.revealAccentSound, options.revealAccentVolume, options);
    this.#playSound(options.revealHumSound, options.revealHumVolume, options);

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "csc-overlay csc-flicker";
    overlay.innerHTML = `
      <div class="csc-scanlines" aria-hidden="true"></div>
      <button type="button" class="csc-close" aria-label="Close card reveal"><i class="fas fa-times"></i></button>
      <figure class="csc-card-frame">
        <span class="csc-card-image-wrap">
          <img class="csc-card-image" alt="${foundry.utils.escapeHTML(card.name)}" src="${card.image}">
        </span>
        <figcaption>${foundry.utils.escapeHTML(card.name)}</figcaption>
      </figure>
    `;
    document.body.appendChild(overlay);

    const image = overlay.querySelector("img");
    image.addEventListener("error", () => overlay.querySelector(".csc-card-frame")?.classList.add("csc-image-error"), { once: true });
    overlay.querySelector(".csc-close")?.addEventListener("click", () => this.closeFullscreen());

    const onKey = (event) => {
      if (event.key === "Escape") this.closeFullscreen();
    };
    overlay._cscKeyHandler = onKey;
    document.addEventListener("keydown", onKey);

    const duration = Number(options.animationDurationMs ?? 1600);
    window.setTimeout(() => overlay.classList.remove("csc-flicker"), duration);
  }

  static collapse({ playSound = true } = {}) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay || !this.current || overlay.classList.contains("csc-collapsing")) return;
    if (playSound) this.#playSound(this.current.options?.hideSound, this.current.options?.hideVolume, this.current.options);
    overlay.classList.add("csc-collapsing");
    window.setTimeout(() => {
      this.#removeOverlay();
      this.#createIcon();
    }, 650);
  }

  static closeFullscreen() {
    this.collapse({ playSound: true });
  }

  static #playSound(src, soundVolume, options = {}) {
    if (!options.enableSound || !src) return;
    const volume = Number(soundVolume);
    try {
      foundry.audio?.AudioHelper?.play?.({
        src,
        volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.8,
        autoplay: true,
        loop: false
      }, false)?.catch?.(() => {});
    } catch (error) {
      // Missing files or blocked browser audio should never interrupt the reveal workflow.
    }
  }

  static showVideo({ videoId, autoplay = true, controls = false, allowClose = true, displayMode = "clean" } = {}) {
    if (!videoId) return;
    this.current = null;
    this.#removeOverlay();
    this.#removeIcon();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = `csc-video-overlay ${displayMode === "crt" ? "csc-video-overlay--crt" : "csc-overlay csc-video-overlay--clean"}`;
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      controls: controls ? "1" : "0",
      rel: "0",
      modestbranding: "1",
      playsinline: "1"
    });
    const embedSrc = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
    overlay.innerHTML = displayMode === "crt"
      ? this.#videoCrtTemplate(embedSrc, allowClose)
      : this.#videoCleanTemplate(embedSrc, allowClose);
    document.body.appendChild(overlay);
    if (displayMode === "crt") this.#prepareCrtFrame(overlay);

    const close = () => this.#removeOverlay();
    if (allowClose) {
      overlay.querySelector(".csc-video-close, .csc-close")?.addEventListener("click", close);
      const onKey = (event) => {
        if (event.key === "Escape") close();
      };
      overlay._cscKeyHandler = onKey;
      document.addEventListener("keydown", onKey);
    }
  }

  static #videoCleanTemplate(embedSrc, allowClose) {
    return `
      <div class="csc-scanlines" aria-hidden="true"></div>
      ${allowClose ? '<button type="button" class="csc-close" aria-label="Close video"><i class="fas fa-times"></i></button>' : ""}
      <div class="csc-video-frame">
        <iframe
          src="${embedSrc}"
          title="Cinematic Sanity Cards Video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }

  static #videoCrtTemplate(embedSrc, allowClose) {
    const screenStyle = `left: ${CRT_SCREEN.left}%; top: ${CRT_SCREEN.top}%; width: ${CRT_SCREEN.width}%; height: ${CRT_SCREEN.height}%;`;
    const frame = CRT_FRAME_PATH ? `<img class="csc-crt-frame" src="${CRT_FRAME_PATH}" alt="" aria-hidden="true">` : "";
    return `
      <div class="csc-video-backdrop"></div>
      <div class="csc-crt-stage">
        <div class="csc-crt-frame-box">
          <div class="csc-crt-screen" style="${screenStyle}">
            <iframe class="csc-crt-iframe" src="${embedSrc}" title="Cinematic Sanity Cards Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
            <div class="csc-crt-scanlines"></div>
            <div class="csc-crt-noise"></div>
            <div class="csc-crt-vignette"></div>
            <div class="csc-crt-glare"></div>
          </div>
          ${frame}
        </div>
      </div>
      ${allowClose ? '<button type="button" class="csc-video-close" aria-label="Close video">×</button>' : ""}
    `;
  }

  static #prepareCrtFrame(overlay) {
    const frame = overlay.querySelector(".csc-crt-frame");
    const frameBox = overlay.querySelector(".csc-crt-frame-box");
    if (!frame) {
      frameBox?.classList.add("csc-crt-frame-box--missing-frame");
      console.warn("Cinematic Sanity Cards | CRT TV frame asset is missing; showing CRT video without the PNG frame.");
      return;
    }
    frame.addEventListener("error", () => {
      frame.remove();
      frameBox?.classList.add("csc-crt-frame-box--missing-frame");
      console.warn(`Cinematic Sanity Cards | CRT TV frame failed to load: ${CRT_FRAME_PATH}. Showing CRT video without the PNG frame.`);
    }, { once: true });
  }

  static #createIcon() {
    this.#removeIcon();
    const { card } = this.current ?? {};
    if (!card) return;
    const icon = document.createElement("div");
    icon.id = ICON_ID;
    icon.className = "csc-collapsed-icon";
    icon.innerHTML = `
      <button type="button" class="csc-icon-open" title="Open ${foundry.utils.escapeHTML(card.name)}">
        <img src="${card.image}" alt="${foundry.utils.escapeHTML(card.name)}">
      </button>
      <button type="button" class="csc-icon-close" title="Dismiss card"><i class="fas fa-times"></i></button>
    `;
    document.body.appendChild(icon);
    icon.querySelector(".csc-icon-open")?.addEventListener("click", () => this.show(this.current.card, this.current.folder, this.current.options));
    icon.querySelector(".csc-icon-close")?.addEventListener("click", () => this.#removeIcon());
  }

  static #removeOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    if (overlay._cscKeyHandler) document.removeEventListener("keydown", overlay._cscKeyHandler);
    overlay.remove();
  }

  static #removeIcon() {
    document.getElementById(ICON_ID)?.remove();
  }
}
