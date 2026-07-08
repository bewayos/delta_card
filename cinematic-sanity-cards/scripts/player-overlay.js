import { MODULE_ID } from "./card-store.js";

const OVERLAY_ID = `${MODULE_ID}-overlay`;
const ICON_ID = `${MODULE_ID}-collapsed`;

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

  static showVideo({ videoId, autoplay = true, controls = false, allowClose = true } = {}) {
    if (!videoId) return;
    this.current = null;
    this.#removeOverlay();
    this.#removeIcon();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "csc-overlay csc-video-overlay";
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      controls: controls ? "1" : "0",
      rel: "0",
      modestbranding: "1"
    });
    overlay.innerHTML = `
      <div class="csc-scanlines" aria-hidden="true"></div>
      ${allowClose ? '<button type="button" class="csc-close" aria-label="Close video"><i class="fas fa-times"></i></button>' : ""}
      <div class="csc-video-frame">
        <iframe
          src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}"
          title="Cinematic Sanity Cards Video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => this.#removeOverlay();
    if (allowClose) {
      overlay.querySelector(".csc-close")?.addEventListener("click", close);
      const onKey = (event) => {
        if (event.key === "Escape") close();
      };
      overlay._cscKeyHandler = onKey;
      document.addEventListener("keydown", onKey);
    }
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
