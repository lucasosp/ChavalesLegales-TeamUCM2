// Static URLs let Vite publish every illustration with the novel, including standalone builds.
export const illustrations = {
  saraNormal: { src: new URL("../../../images/sara_normal.png", import.meta.url).href, label: "Sara · neutral", frame: { top: 0, bottom: 1200, center: 540 } },
  saraHappy: { src: new URL("../../../images/sara_feliz.png", import.meta.url).href, label: "Sara · alegre", frame: { top: -20, bottom: 1180, center: 545 } },
  saraSad: { src: new URL("../../../images/sara_triste.png", import.meta.url).href, label: "Sara · triste", frame: { top: -20, bottom: 1180, center: 550 } },
  saraCrying: { src: new URL("../../../images/sara_llorando.png", import.meta.url).href, label: "Sara · llorando", frame: { top: 0, bottom: 1200, center: 540 } },
  saraShy: { src: new URL("../../../images/sara_verguenza.png", import.meta.url).href, label: "Sara · tímida", frame: { top: 0, bottom: 1200, center: 540 } },
  saraShyAlt: { src: new URL("../../../images/Shy Blushing Anime Girl Sticker.png", import.meta.url).href, label: "Sara · tímida, variante", frame: { top: 0, bottom: 1200, center: 540 } },
  saraShyAlt2: { src: new URL("../../../images/Shy Blushing Anime Girl Sticker(1).png", import.meta.url).href, label: "Sara · tímida, variante 2", frame: { top: 0, bottom: 1200, center: 540 } },
  paula: { src: new URL("../../../images/Freckled Ginger Varsity Girl.png", import.meta.url).href, label: "Paula · neutral", frame: { top: -20, bottom: 1180, center: 560 } },
  paulaHappy: { src: new URL("../../../images/Cheerful Auburn Varsity Girl.png", import.meta.url).href, label: "Paula · alegre", frame: { top: -20, bottom: 1180, center: 560 } },
  julia: { src: new URL("../../../images/Curly-Haired Girl in Lilac Hoodie.png", import.meta.url).href, label: "Julia · neutral", frame: { top: 0, bottom: 960, center: 560 } },
  juliaHappy: { src: new URL("../../../images/Cheerful Julia in Lavender Hoodie.png", import.meta.url).href, label: "Julia · alegre", frame: { top: -20, bottom: 1180, center: 545 } },
  dani: { src: new URL("../../../images/Casual Boy in Mustard Tee.png", import.meta.url).href, label: "Dani", frame: { top: 40, bottom: 960, center: 512 } },
  laura: { src: new URL("../../../images/Warm Studio Portrait of a Woman.png", import.meta.url).href, label: "Laura", frame: { top: -10, bottom: 890, center: 512 } },
  irene: { src: new URL("../../../images/Elegant Office Professional Portrait.png", import.meta.url).href, label: "Irene", frame: { top: -10, bottom: 790, center: 512 } },
  elena: { src: new URL("../../../images/Elegant Office Professional Portrait(1).png", import.meta.url).href, label: "Elena", frame: { top: -10, bottom: 790, center: 512 } },
  judge: { src: new URL("../../../images/jueza-transparente.png", import.meta.url).href, label: "Jueza", frame: { top: -10, bottom: 1190, center: 512 } },
};

const people = { Sara: "saraNormal", Paula: "paula", Julia: "julia", Dani: "dani", Laura: "laura", Irene: "irene", Elena: "elena", Jueza: "judge", "Su familia": "dani" };
const expressions = { neutral: "saraNormal", smile: "saraHappy", happy: "saraHappy", sad: "saraSad", crying: "saraCrying", surprised: "saraShy", shy: "saraShy" };

export function characterImage(character) {
  if (character.id === "sara") return illustrations[expressions[character.expression] ?? "saraNormal"].src;
  if (character.id === "julia") return illustrations[["happy", "smile"].includes(character.expression) ? "juliaHappy" : "julia"].src;
  return null;
}

export function personPortrait(name, { expression = "neutral", nodeId = "" } = {}) {
  let key = people[name];
  if (name === "Sara") {
    key = expressions[expression] ?? "saraNormal";
    if (nodeId === "c2-01") key = "saraCrying";
    if (nodeId === "c1-05") key = "saraShy";
  }
  if (name === "Paula" && /^(c1-02|c4-|epilogue)/.test(nodeId)) key = "paulaHappy";
  return illustrations[key] ?? null;
}

export function personImage(name) {
  return personPortrait(name)?.src ?? null;
}

// Every illustration is composed into the same head-to-upper-hip viewport.
// These source landmarks deliberately exclude the legs in full-body originals.
export const PORTRAIT_ASPECT = .8;
export function framePortrait(image, art) {
  const { top, bottom, center } = art.frame;
  const height = bottom - top;
  const width = height * PORTRAIT_ASPECT;
  const left = center - width / 2;
  image.style.width = `${image.naturalWidth / width * 100}%`;
  image.style.height = `${image.naturalHeight / height * 100}%`;
  image.style.left = `${-left / width * 100}%`;
  image.style.top = `${-top / height * 100}%`;
  image.dataset.bodyRegion = "head-to-upper-hip";
}
