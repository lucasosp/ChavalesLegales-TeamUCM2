// Static URLs let Vite publish every illustration with the novel, including standalone builds.
export const illustrations = {
  saraNormal: { src: new URL("../../../images/sara_normal.png", import.meta.url).href, label: "Sara · neutral", zoom: 1 },
  saraHappy: { src: new URL("../../../images/sara_feliz.png", import.meta.url).href, label: "Sara · alegre", zoom: 1 },
  saraSad: { src: new URL("../../../images/sara_triste.png", import.meta.url).href, label: "Sara · triste", zoom: 1 },
  saraCrying: { src: new URL("../../../images/sara_llorando.png", import.meta.url).href, label: "Sara · llorando", zoom: 1 },
  saraShy: { src: new URL("../../../images/sara_verguenza.png", import.meta.url).href, label: "Sara · tímida", zoom: 1 },
  saraShyAlt: { src: new URL("../../../images/Shy Blushing Anime Girl Sticker.png", import.meta.url).href, label: "Sara · tímida, variante", zoom: 1 },
  saraShyAlt2: { src: new URL("../../../images/Shy Blushing Anime Girl Sticker(1).png", import.meta.url).href, label: "Sara · tímida, variante 2", zoom: 1 },
  paula: { src: new URL("../../../images/Freckled Ginger Varsity Girl.png", import.meta.url).href, label: "Paula · neutral", zoom: 1 },
  paulaHappy: { src: new URL("../../../images/Cheerful Auburn Varsity Girl.png", import.meta.url).href, label: "Paula · alegre", zoom: 1 },
  julia: { src: new URL("../../../images/Curly-Haired Girl in Lilac Hoodie.png", import.meta.url).href, label: "Julia · neutral", zoom: 1.65 },
  juliaHappy: { src: new URL("../../../images/Cheerful Julia in Lavender Hoodie.png", import.meta.url).href, label: "Julia · alegre", zoom: 1 },
  dani: { src: new URL("../../../images/Casual Boy in Mustard Tee.png", import.meta.url).href, label: "Dani", zoom: 1.65 },
  laura: { src: new URL("../../../images/Warm Studio Portrait of a Woman.png", import.meta.url).href, label: "Laura", zoom: 1.7 },
  irene: { src: new URL("../../../images/Elegant Office Professional Portrait.png", import.meta.url).href, label: "Irene", zoom: 1.7 },
  elena: { src: new URL("../../../images/Elegant Office Professional Portrait(1).png", import.meta.url).href, label: "Elena", zoom: 1.7 },
  judge: { src: new URL("../../../images/Distinguished Judge with Documents.png", import.meta.url).href, label: "Jueza", zoom: 1.6 },
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
