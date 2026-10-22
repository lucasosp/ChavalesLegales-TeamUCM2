import es from "./locales/es.json" with { type: "json" };
import ca from "./locales/ca.json" with { type: "json" };
import va from "./locales/va.json" with { type: "json" };
import gl from "./locales/gl.json" with { type: "json" };
import eu from "./locales/eu.json" with { type: "json" };
import oc from "./locales/oc.json" with { type: "json" };

export const LANGS = ["es", "ca", "va", "gl", "eu", "oc"];
export const DEFAULT_LANG = "es";
// Nombres en su propia lengua (endónimos): no se traducen, se eligen.
export const LANG_LABELS = {
  es: "Castellano",
  ca: "Català",
  va: "Valencià",
  gl: "Galego",
  eu: "Euskara",
  oc: "Aranés",
};
const DICTIONARIES = { es, ca, va, gl, eu, oc };
const STORAGE_KEY = "chavales_lang";

// Read once at startup: main.js rewrites the query string while navigating.
const URL_LANG = (() => {
  try {
    const fromUrl = new URLSearchParams(globalThis.location?.search ?? "").get("lang");
    return LANGS.includes(fromUrl) ? fromUrl : null;
  } catch {
    return null;
  }
})();

/** Active language: `?lang=` in the URL wins over the platform's saved choice. */
export function getLang() {
  if (URL_LANG) return URL_LANG;
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (LANGS.includes(stored)) return stored;
  } catch {
    // Storage can be blocked (private mode, sandboxed iframe).
  }
  return DEFAULT_LANG;
}

/**
 * Guarda el idioma elegido y quita el `?lang=` de la URL para que la elección
 * guardada mande al recargar. La novela se construye con el idioma al cargar,
 * así que quien llama a esto debe recargar la página después.
 */
export function setLang(code) {
  if (!LANGS.includes(code)) return;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, code);
  } catch {
    // Storage can be blocked (private mode, sandboxed iframe).
  }
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.delete("lang");
    globalThis.history.replaceState({}, "", url);
  } catch {
    // Without history the saved language still wins on the next load.
  }
}

function lookup(dictionary, key) {
  if (!dictionary) return undefined;
  if (typeof dictionary[key] === "string") return dictionary[key];
  let value = dictionary;
  for (const part of key.split(".")) {
    if (value == null || typeof value !== "object") return undefined;
    value = value[part];
  }
  return typeof value === "string" ? value : undefined;
}

/** Translate a dotted key, falling back to Spanish and then to the key itself. */
export function t(key, vars) {
  const text = lookup(DICTIONARIES[getLang()], key) ?? lookup(DICTIONARIES[DEFAULT_LANG], key) ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/** True when the key exists (in any language), useful for optional labels. */
export function hasKey(key) {
  return lookup(DICTIONARIES[DEFAULT_LANG], key) !== undefined;
}

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Generic deep merge returning a copy: objects merge per key, arrays per
 * index, and any other overlay value (strings, numbers…) replaces the base.
 */
export function applyOverlay(base, overlay) {
  if (overlay === undefined || overlay === null) return structuredClone(base);
  if (Array.isArray(base) && Array.isArray(overlay)) {
    const result = structuredClone(base);
    overlay.forEach((item, index) => {
      result[index] = index < base.length ? applyOverlay(base[index], item) : structuredClone(item);
    });
    return result;
  }
  if (Array.isArray(base) && isPlainObject(overlay)) {
    // Allow index-keyed objects ({ "0": {...} }) as array overlays.
    const result = structuredClone(base);
    for (const [key, item] of Object.entries(overlay)) {
      const index = Number(key);
      if (Number.isInteger(index) && index >= 0) result[index] = applyOverlay(base[index], item);
    }
    return result;
  }
  if (isPlainObject(base) && isPlainObject(overlay)) {
    const result = structuredClone(base);
    for (const [key, item] of Object.entries(overlay)) {
      result[key] = key in base ? applyOverlay(base[key], item) : structuredClone(item);
    }
    return result;
  }
  return structuredClone(overlay);
}

/** Fetch an optional translation overlay; resolves to null on 404 or any error. */
export async function fetchOverlay(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
