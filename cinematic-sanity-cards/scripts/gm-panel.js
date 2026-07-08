import { CardStore, MODULE_ID, slugify } from "./card-store.js";
import { sendCardReveal } from "./socket.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CinematicSanityCardsPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-gm-panel`,
    classes: [MODULE_ID, "csc-gm-panel"],
    tag: "form",
    window: { title: "Cinematic Sanity Cards", icon: "fa-solid fa-id-card", resizable: true },
    position: { width: 780, height: 760 },
    actions: {
      showSelected: CinematicSanityCardsPanel.#showSelected,
      showRandom: CinematicSanityCardsPanel.#showRandom,
      browseImage: CinematicSanityCardsPanel.#browseImage,
      browseSound: CinematicSanityCardsPanel.#browseSound,
      saveOptions: CinematicSanityCardsPanel.#saveOptions,
      saveFolder: CinematicSanityCardsPanel.#saveFolder,
      deleteFolder: CinematicSanityCardsPanel.#deleteFolder,
      saveCard: CinematicSanityCardsPanel.#saveCard,
      editCard: CinematicSanityCardsPanel.#editCard,
      deleteCard: CinematicSanityCardsPanel.#deleteCard
    }
  };

  static PARTS = { body: { template: `modules/${MODULE_ID}/templates/gm-panel.hbs` } };

  async _prepareContext() {
    const folders = CardStore.getFolders();
    const cards = CardStore.getCards();
    const users = game.users.contents.map((user) => ({ id: user.id, name: user.name, isGM: user.isGM, active: user.active }))
      .sort((a, b) => Number(b.active && !b.isGM) - Number(a.active && !a.isGM) || a.name.localeCompare(b.name));
    return { folders, cards, users, options: CardStore.getOptions(), hasFolders: folders.length > 0, moduleId: MODULE_ID };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.addEventListener("input", this.#onInput.bind(this));
    this.element.querySelector("[name='revealFolderId']")?.addEventListener("change", () => this.#refreshFilteredCards());
    this.element.querySelector("[name='revealCardId']")?.addEventListener("change", () => this.#refreshPreview());
    this.#refreshFilteredCards();
  }

  #onInput(event) {
    if (event.target.name === "folderName" && !this.element.querySelector("[name='folderId']").dataset.touched) this.element.querySelector("[name='folderId']").value = slugify(event.target.value);
    if (event.target.name === "folderId") event.target.dataset.touched = "true";
    if (event.target.name === "cardName" && !this.element.querySelector("[name='cardId']").dataset.touched) this.element.querySelector("[name='cardId']").value = slugify(event.target.value);
    if (event.target.name === "cardId") event.target.dataset.touched = "true";
  }

  #refreshFilteredCards() {
    const folderId = this.element.querySelector("[name='revealFolderId']")?.value;
    const select = this.element.querySelector("[name='revealCardId']");
    if (!select) return;
    const cards = CardStore.getCardsByFolder(folderId);
    select.innerHTML = cards.map((card) => `<option value="${card.id}">${foundry.utils.escapeHTML(card.name)}</option>`).join("");
    this.#refreshPreview();
  }

  #refreshPreview() {
    const card = CardStore.getCard(this.element.querySelector("[name='revealCardId']")?.value);
    const preview = this.element.querySelector(".csc-preview");
    if (!preview) return;
    preview.innerHTML = card ? `<img src="${card.image}" alt="${foundry.utils.escapeHTML(card.name)}"><span>${foundry.utils.escapeHTML(card.name)}</span>` : `<span>No card selected</span>`;
  }

  static #target(app) { return app.element.querySelector("[name='targetUserId']")?.value; }
  static #folder(app) { return app.element.querySelector("[name='revealFolderId']")?.value; }

  static #showSelected(event, target) {
    const card = CardStore.getCard(this.element.querySelector("[name='revealCardId']")?.value);
    if (!card) return ui.notifications.warn("Choose a card to reveal.");
    const user = game.users.get(CinematicSanityCardsPanel.#target(this));
    if (sendCardReveal({ targetUserId: user?.id, card, folder: CardStore.getFolder(card.folderId), revealMode: "totem" })) ui.notifications.info(`Sent card: ${card.name} to ${user.name}`);
  }

  static #showRandom() {
    const cards = CardStore.getCardsByFolder(CinematicSanityCardsPanel.#folder(this));
    if (!cards.length) return ui.notifications.warn("No cards exist in the selected folder.");
    const card = cards[Math.floor(Math.random() * cards.length)];
    const user = game.users.get(CinematicSanityCardsPanel.#target(this));
    if (sendCardReveal({ targetUserId: user?.id, card, folder: CardStore.getFolder(card.folderId), revealMode: "totem" })) ui.notifications.info(`Sent random card: ${card.name} to ${user.name}`);
  }

  static #browseImage() {
    new FilePicker({ type: "image", current: this.element.querySelector("[name='cardImage']")?.value ?? "", callback: (path) => { this.element.querySelector("[name='cardImage']").value = path; } }).browse();
  }

  static #browseSound(event, target) {
    const input = this.element.querySelector(`[name='${target.dataset.target}']`);
    if (!input) return;
    new FilePicker({ type: "audio", current: input.value ?? "", callback: (path) => { input.value = path; } }).browse();
  }

  static async #saveOptions() {
    try {
      await CardStore.setOptions({
        enableSound: this.element.querySelector("[name='enableSound']")?.checked,
        revealAccentSound: this.element.querySelector("[name='revealAccentSound']")?.value,
        revealAccentVolume: this.element.querySelector("[name='revealAccentVolume']")?.value,
        revealHumSound: this.element.querySelector("[name='revealHumSound']")?.value,
        revealHumVolume: this.element.querySelector("[name='revealHumVolume']")?.value,
        hideSound: this.element.querySelector("[name='hideSound']")?.value,
        hideVolume: this.element.querySelector("[name='hideVolume']")?.value
      });
      ui.notifications.info("Sound options saved.");
      this.render({ force: true });
    } catch (error) { ui.notifications.error(error.message); }
  }

  static async #saveFolder() {
    try {
      await CardStore.upsertFolder({ name: this.element.querySelector("[name='folderName']").value, id: this.element.querySelector("[name='folderId']").value });
      ui.notifications.info("Folder saved.");
      this.render({ force: true });
    } catch (error) { ui.notifications.error(error.message); }
  }

  static async #deleteFolder(event, target) {
    const id = target.dataset.folderId;
    const count = CardStore.getCardsByFolder(id).length;
    const deleteCards = count ? await foundry.applications.api.DialogV2.confirm({ window: { title: "Delete Folder" }, content: `<p>Delete this folder and its ${count} contained card(s)?</p>` }) : false;
    if (count && !deleteCards) return;
    try { await CardStore.deleteFolder(id, { deleteCards }); this.render({ force: true }); } catch (error) { ui.notifications.error(error.message); }
  }

  static async #saveCard() {
    try {
      await CardStore.upsertCard({ name: this.element.querySelector("[name='cardName']").value, id: this.element.querySelector("[name='cardId']").value, folderId: this.element.querySelector("[name='cardFolderId']").value, image: this.element.querySelector("[name='cardImage']").value, originalId: this.element.querySelector("[name='cardOriginalId']").value || undefined });
      ui.notifications.info("Card saved.");
      this.render({ force: true });
    } catch (error) { ui.notifications.error(error.message); }
  }

  static #editCard(event, target) {
    const card = CardStore.getCard(target.dataset.cardId);
    if (!card) return;
    this.element.querySelector("[name='cardOriginalId']").value = card.id;
    this.element.querySelector("[name='cardName']").value = card.name;
    this.element.querySelector("[name='cardId']").value = card.id;
    this.element.querySelector("[name='cardFolderId']").value = card.folderId;
    this.element.querySelector("[name='cardImage']").value = card.image;
  }

  static async #deleteCard(event, target) {
    if (!await foundry.applications.api.DialogV2.confirm({ window: { title: "Delete Card" }, content: "<p>Delete this card?</p>" })) return;
    await CardStore.deleteCard(target.dataset.cardId);
    this.render({ force: true });
  }
}
