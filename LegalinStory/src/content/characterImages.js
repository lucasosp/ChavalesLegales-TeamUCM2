// Illustrations supplied for the frontend. The preparatory script copies them
// from the repository's images/ directory to Next's public/images/ directory.
const characterFiles = {
  sara: {
    neutral: "sara_normal.png",
    smile: "sara_feliz.png",
    happy: "sara_feliz.png",
    sad: "sara_triste.png",
    surprised: "sara_verguenza.png",
  },
  julia: {
    smile: "Cheerful Julia in Lavender Hoodie.png",
    happy: "Cheerful Julia in Lavender Hoodie.png",
  },
};

const peopleFiles = {
  Sara: "sara_normal.png",
  Paula: "Cheerful Auburn Varsity Girl.png",
  Laura: "Warm Studio Portrait of a Woman.png",
  Irene: "Elegant Office Professional Portrait.png",
  Elena: "Elegant Office Professional Portrait(1).png",
  Jueza: "Distinguished Judge with Documents.png",
};

export function imageUrl(filename) {
  return `/images/${encodeURIComponent(filename)}`;
}

export function hasCharacterImages() {
  return typeof document !== "undefined" && document.baseURI.includes("/novela/");
}

export function characterImage(character) {
  if (!hasCharacterImages()) return null;
  const files = characterFiles[character.id];
  if (!files) return null;
  const expression = character.expression ?? "neutral";
  const filename = files[expression] ?? files.neutral;
  return filename ? imageUrl(filename) : null;
}

export function personImage(name) {
  if (!hasCharacterImages()) return null;
  const filename = peopleFiles[name];
  return filename ? imageUrl(filename) : null;
}

export function speakerSprite(name) {
  // The judge image has a solid background, so it belongs in the portrait card.
  return name === "Jueza" ? null : personImage(name);
}
