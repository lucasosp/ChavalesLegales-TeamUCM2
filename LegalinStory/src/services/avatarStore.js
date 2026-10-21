/**
 * Manages the projective avatar drawings across the 3 sequential phases:
 * Phase 1 (Antes): Pre-trauma avatar drawn before the story begins.
 * Phase 2 (Durante/Post-trauma): Re-drawn avatar at the peak crisis, becomes profile picture.
 * Phase 3 (Después): Comparison & choice between Avatar 1 and Avatar 2 at the story ending.
 *
 * Enforces irreversibility to preserve the projective validity of the test.
 */

const STORAGE_KEY = "legalinstory_avatar_drawings";

class AvatarStore {
  constructor() {
    this.memory = {
      phase1: null,
      phase2: null,
      finalChoice: null, // "phase1" | "phase2"
      phase1Completed: false,
      phase2Completed: false,
      phase3Completed: false,
    };
    this.#load();
  }

  #load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.memory = { ...this.memory, ...parsed };
      }
    } catch {
      // localStorage may fail in restricted/sandboxed iframes; memory fallback is maintained
    }
  }

  #persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    } catch {
      // fallback to memory
    }
  }

  savePhase1(dataUrl) {
    this.memory.phase1 = dataUrl;
    this.memory.phase1Completed = true;
    this.#persist();
  }

  savePhase2(dataUrl) {
    this.memory.phase2 = dataUrl;
    this.memory.phase2Completed = true;
    this.#persist();
  }

  saveFinalChoice(choice) {
    if (choice !== "phase1" && choice !== "phase2") return;
    this.memory.finalChoice = choice;
    this.memory.phase3Completed = true;
    this.#persist();
  }

  getPhase1() {
    return this.memory.phase1;
  }

  getPhase2() {
    return this.memory.phase2;
  }

  getFinalChoice() {
    return this.memory.finalChoice;
  }

  isPhase1Completed() {
    return Boolean(this.memory.phase1Completed && this.memory.phase1);
  }

  isPhase2Completed() {
    return Boolean(this.memory.phase2Completed && this.memory.phase2);
  }

  isPhase3Completed() {
    return Boolean(this.memory.phase3Completed && this.memory.finalChoice);
  }

  /** Returns the active avatar URL to display in profiles and dialogue cards */
  getActiveAvatar() {
    if (this.memory.finalChoice === "phase1") return this.memory.phase1;
    if (this.memory.finalChoice === "phase2") return this.memory.phase2;
    if (this.memory.phase2Completed && this.memory.phase2) return this.memory.phase2;
    if (this.memory.phase1Completed && this.memory.phase1) return this.memory.phase1;
    return null;
  }

  clear() {
    this.memory = {
      phase1: null,
      phase2: null,
      finalChoice: null,
      phase1Completed: false,
      phase2Completed: false,
      phase3Completed: false,
    };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const avatarStore = new AvatarStore();
