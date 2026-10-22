// Static URLs let Vite publish every illustration with the novel, including standalone builds.
export const illustrations = {
  saraNormal: { src: new URL("../../../images/sara_normal.png", import.meta.url).href, label: "Sara · neutral", frame: { top: -160, bottom: 1020, center: 525 } },
  saraHappy: { src: new URL("../../../images/sara_feliz.png", import.meta.url).href, label: "Sara · alegre", frame: { top: -160, bottom: 1020, center: 535 } },
  saraSad: { src: new URL("../../../images/sara_triste.png", import.meta.url).href, label: "Sara · triste", frame: { top: -160, bottom: 1020, center: 540 } },
  saraCrying: { src: new URL("../../../images/sara_llorando.png", import.meta.url).href, label: "Sara · llorando", frame: { top: -160, bottom: 1020, center: 535 } },
  saraShy: { src: new URL("../../../images/sara_verguenza.png", import.meta.url).href, label: "Sara · tímida", frame: { top: -160, bottom: 1020, center: 520 } },
  saraShyAlt: { src: new URL("../../../images/Shy Blushing Anime Girl Sticker.png", import.meta.url).href, label: "Sara · tímida, variante", frame: { top: -160, bottom: 1020, center: 520 } },
  saraShyAlt2: { src: new URL("../../../images/Shy Blushing Anime Girl Sticker(1).png", import.meta.url).href, label: "Sara · tímida, variante 2", frame: { top: -160, bottom: 1020, center: 520 } },
  paula: { src: new URL("../../../images/Freckled Ginger Varsity Girl.png", import.meta.url).href, label: "Paula · neutral", frame: { top: -175, bottom: 1005, center: 540 } },
  paulaHappy: { src: new URL("../../../images/Cheerful Auburn Varsity Girl.png", import.meta.url).href, label: "Paula · alegre", frame: { top: -175, bottom: 1005, center: 550 } },
  julia: { src: new URL("../../../images/Curly-Haired Girl in Lilac Hoodie.png", import.meta.url).href, label: "Julia · neutral", frame: { top: -165, bottom: 1015, center: 580 } },
  juliaHappy: { src: new URL("../../../images/Cheerful Julia in Lavender Hoodie.png", import.meta.url).href, label: "Julia · alegre", frame: { top: -165, bottom: 1015, center: 530 } },
  dani: { src: new URL("../../../images/Casual Boy in Mustard Tee.png", import.meta.url).href, label: "Dani", frame: { top: -240, bottom: 1060, center: 515 } },
  laura: { src: new URL("../../../images/Warm Studio Portrait of a Woman.png", import.meta.url).href, label: "Laura", frame: { top: -30, bottom: 690, center: 535 } },
  irene: { src: new URL("../../../images/Elegant Office Professional Portrait.png", import.meta.url).href, label: "Irene", frame: { top: -30, bottom: 690, center: 500 } },
  elena: { src: new URL("../../../images/Elegant Office Professional Portrait(1).png", import.meta.url).href, label: "Elena", frame: { top: -30, bottom: 690, center: 500 } },
  judge: { src: new URL("../../../images/jueza-transparente.png", import.meta.url).href, label: "Jueza", frame: { top: -40, bottom: 1140, center: 505 } },
};

const people = { Sara: "saraNormal", Paula: "paula", Julia: "julia", Dani: "dani", Laura: "laura", Irene: "elena", Elena: "irene", Jueza: "judge", "Su familia": "dani" };
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
