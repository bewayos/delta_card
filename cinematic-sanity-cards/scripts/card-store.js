export const MODULE_ID = "cinematic-sanity-cards";

export const DEFAULT_OPTIONS = Object.freeze({
  animationDurationMs: 1600,
  collapseDelayMs: 4500,
  enableSound: false,
  defaultRevealMode: "totem"
});

const SETTINGS_KEY = "data";

function duplicateData(value) {
  return foundry.utils.deepClone(value ?? {});
}

export function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || randomID();
}

function randomID() {
  return foundry.utils.randomID(8).toLowerCase();
}

function requireGM() {
  if (!game.user?.isGM) throw new Error("Only a GM can manage Cinematic Sanity Cards.");
}

function normalizeData(data = {}) {
  return {
    folders: Array.isArray(data.folders) ? data.folders : [],
    cards: Array.isArray(data.cards) ? data.cards : [],
    options: { ...DEFAULT_OPTIONS, ...(data.options ?? {}) }
  };
}

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS_KEY, {
    name: "Cinematic Sanity Cards Data",
    scope: "world",
    config: false,
    type: Object,
    default: normalizeData()
  });
}

export class CardStore {
  static get data() {
    return normalizeData(duplicateData(game.settings.get(MODULE_ID, SETTINGS_KEY)));
  }

  static async setData(data) {
    requireGM();
    return game.settings.set(MODULE_ID, SETTINGS_KEY, normalizeData(data));
  }

  static getFolders() {
    return this.data.folders.sort((a, b) => a.name.localeCompare(b.name));
  }

  static getCards() {
    return this.data.cards.sort((a, b) => a.name.localeCompare(b.name));
  }

  static getOptions() {
    return this.data.options;
  }

  static getFolder(id) {
    return this.data.folders.find((folder) => folder.id === id) ?? null;
  }

  static getCard(id) {
    return this.data.cards.find((card) => card.id === id) ?? null;
  }

  static getCardsByFolder(folderId) {
    return this.getCards().filter((card) => card.folderId === folderId);
  }

  static async upsertFolder(folder) {
    requireGM();
    const data = this.data;
    const clean = { id: slugify(folder.id || folder.name), name: String(folder.name ?? "").trim() };
    if (!clean.name) throw new Error("Folder name is required.");
    const existing = data.folders.find((item) => item.id === clean.id);
    if (existing && existing.id !== folder.originalId) throw new Error(`Folder ID '${clean.id}' already exists.`);
    if (folder.originalId && folder.originalId !== clean.id) {
      if (data.folders.some((item) => item.id === clean.id)) throw new Error(`Folder ID '${clean.id}' already exists.`);
      data.cards = data.cards.map((card) => card.folderId === folder.originalId ? { ...card, folderId: clean.id } : card);
      data.folders = data.folders.map((item) => item.id === folder.originalId ? clean : item);
    } else if (existing) {
      Object.assign(existing, clean);
    } else {
      data.folders.push(clean);
    }
    return this.setData(data);
  }

  static async deleteFolder(folderId, { deleteCards = false } = {}) {
    requireGM();
    const data = this.data;
    const contained = data.cards.filter((card) => card.folderId === folderId);
    if (contained.length && !deleteCards) throw new Error("Folder is not empty.");
    data.folders = data.folders.filter((folder) => folder.id !== folderId);
    if (deleteCards) data.cards = data.cards.filter((card) => card.folderId !== folderId);
    return this.setData(data);
  }

  static async upsertCard(card) {
    requireGM();
    const data = this.data;
    const clean = {
      id: slugify(card.id || card.name),
      name: String(card.name ?? "").trim(),
      folderId: String(card.folderId ?? ""),
      image: String(card.image ?? "").trim()
    };
    if (!clean.name) throw new Error("Card name is required.");
    if (!clean.folderId || !data.folders.some((folder) => folder.id === clean.folderId)) throw new Error("Choose a valid folder.");
    if (!clean.image) throw new Error("Image path is required.");
    const existing = data.cards.find((item) => item.id === clean.id);
    if (existing && existing.id !== card.originalId) throw new Error(`Card ID '${clean.id}' already exists.`);
    if (card.originalId && card.originalId !== clean.id) {
      if (data.cards.some((item) => item.id === clean.id)) throw new Error(`Card ID '${clean.id}' already exists.`);
      data.cards = data.cards.map((item) => item.id === card.originalId ? clean : item);
    } else if (existing) {
      Object.assign(existing, clean);
    } else {
      data.cards.push(clean);
    }
    return this.setData(data);
  }

  static async deleteCard(cardId) {
    requireGM();
    const data = this.data;
    data.cards = data.cards.filter((card) => card.id !== cardId);
    return this.setData(data);
  }
}
