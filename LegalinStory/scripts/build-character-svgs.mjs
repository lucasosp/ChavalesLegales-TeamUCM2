/**
 * Builds the shared Chavales Legales cast as SVG sprites.
 *
 * One shared body template keeps the characters visually consistent:
 * school clothes, the same face geometry, and five expressions each.
 *
 *   node scripts/build-character-svgs.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(here, "../public/assets/characters");

const EXPRESSIONS = ["neutral", "smile", "happy", "sad", "surprised"];

const CHARACTERS = {
  sara: {
    name: "Sara",
    skin: "#f0c4ad",
    skinShade: "#dda58e",
    hair: "#6b3a2c",
    hairDark: "#4a271f",
    eyes: "#b9713c",
    blazer: "#2f3b5c",
    blazerDark: "#20283f",
    shirt: "#f5efe6",
    accent: "#c65d73",
    ribbon: true,
    hairStyle: "ponytail",
  },
  julia: {
    name: "Julia",
    skin: "#c98f6e",
    skinShade: "#ad7557",
    hair: "#2f2236",
    hairDark: "#1d1423",
    eyes: "#6f8f6a",
    blazer: "#2f3b5c",
    blazerDark: "#20283f",
    shirt: "#f5efe6",
    accent: "#d7b45a",
    ribbon: true,
    hairStyle: "wavy",
  },
  sergio: {
    name: "Sergio",
    skin: "#e8b89a",
    skinShade: "#ce9b7d",
    hair: "#4a3428",
    hairDark: "#302017",
    eyes: "#6b4a32",
    blazer: "#2f3b5c",
    blazerDark: "#20283f",
    shirt: "#dbe7f0",
    accent: "#4a5a7a",
    tie: true,
    hairStyle: "short",
  },
  hugo: {
    name: "Hugo",
    skin: "#d9a482",
    skinShade: "#bc8566",
    hair: "#241f26",
    hairDark: "#121014",
    eyes: "#5a5a66",
    hoodie: "#3a2e3a",
    hoodieDark: "#251d27",
    shirt: "#8a8494",
    accent: "#8f7b96",
    hairStyle: "spiky",
  },
  marina: {
    name: "Marina",
    skin: "#e8c4ad",
    skinShade: "#cea78f",
    hair: "#3b2a2a",
    hairDark: "#241818",
    eyes: "#4a3026",
    cardigan: "#6b3f4a",
    cardiganDark: "#4d2b34",
    shirt: "#efe6da",
    accent: "#8e6a5c",
    glasses: true,
    hairStyle: "bun",
  },
  maya: {
    name: "Maya",
    skin: "#e7b99f",
    skinShade: "#c99a80",
    hair: "#3a2530",
    hairDark: "#24151d",
    eyes: "#6f4b3f",
    hoodie: "#4a5368",
    hoodieDark: "#303747",
    shirt: "#cfd6dd",
    accent: "#7f91a8",
    hairStyle: "wavy",
  },
  sofi: {
    name: "Sofi",
    skin: "#d7a07c",
    skinShade: "#b98562",
    hair: "#2f2320",
    hairDark: "#1a1211",
    eyes: "#557044",
    blazer: "#33415e",
    blazerDark: "#222c42",
    shirt: "#f5efe6",
    accent: "#e0a45f",
    ribbon: true,
    hairStyle: "ponytail",
  },
  elena: {
    name: "Elena",
    skin: "#e3b79c",
    skinShade: "#c4967c",
    hair: "#5a4038",
    hairDark: "#38251f",
    eyes: "#5d4a3d",
    cardigan: "#4f6b62",
    cardiganDark: "#354a44",
    shirt: "#f0e9dc",
    accent: "#b48d5b",
    glasses: true,
    hairStyle: "bun",
  },
  madre: {
    name: "Mamá",
    skin: "#dfb39a",
    skinShade: "#c09177",
    hair: "#4a342f",
    hairDark: "#2d1f1c",
    eyes: "#5c473b",
    cardigan: "#6d5a63",
    cardiganDark: "#4b3c43",
    shirt: "#ebe3d8",
    accent: "#a9858d",
    hairStyle: "bun",
  },
  padre: {
    name: "Papá",
    skin: "#d5a68a",
    skinShade: "#b78368",
    hair: "#332b2a",
    hairDark: "#1c1717",
    eyes: "#4e3a32",
    blazer: "#3c4452",
    blazerDark: "#272d37",
    shirt: "#d7dde4",
    accent: "#667284",
    tie: true,
    hairStyle: "short",
  },
  profesor: {
    name: "Profesor",
    skin: "#d9ad92",
    skinShade: "#b98a6e",
    hair: "#463832",
    hairDark: "#2a211e",
    eyes: "#4f5b67",
    cardigan: "#4a5d6b",
    cardiganDark: "#33424d",
    shirt: "#eae2d6",
    accent: "#7d8d99",
    glasses: true,
    hairStyle: "short",
  },
  companera: {
    name: "Compañera",
    skin: "#e0b196",
    skinShade: "#c08d72",
    hair: "#3a2a2a",
    hairDark: "#221717",
    eyes: "#5a6650",
    blazer: "#33415e",
    blazerDark: "#222c42",
    shirt: "#f2ece2",
    accent: "#c98e62",
    ribbon: true,
    hairStyle: "ponytail",
  },
  companero: {
    name: "Compañero",
    skin: "#c99777",
    skinShade: "#a97a5e",
    hair: "#2e2524",
    hairDark: "#191313",
    eyes: "#4d505c",
    hoodie: "#4a4350",
    hoodieDark: "#302b35",
    shirt: "#b8b2bd",
    accent: "#7d7388",
    hairStyle: "spiky",
  },
  lucia: {
    name: "Lucía",
    skin: "#d9a98c",
    skinShade: "#bb8c70",
    hair: "#4b332c",
    hairDark: "#2c1c18",
    eyes: "#4c5d6e",
    cardigan: "#6b4b5e",
    cardiganDark: "#4a3140",
    shirt: "#efe6da",
    accent: "#9b7d8e",
    glasses: true,
    hairStyle: "bun",
  },
};

function defs(character) {
  return `
  <defs>
    <linearGradient id="${character.id}-hair-fill" x1="210" y1="70" x2="210" y2="500" gradientUnits="userSpaceOnUse">
      <stop stop-color="${character.hair}" />
      <stop offset="1" stop-color="${character.hairDark}" />
    </linearGradient>
    <linearGradient id="${character.id}-clothes-fill" x1="210" y1="430" x2="210" y2="620" gradientUnits="userSpaceOnUse">
      <stop stop-color="${character.blazer ?? character.hoodie ?? character.cardigan}" />
      <stop offset="1" stop-color="${character.blazerDark ?? character.hoodieDark ?? character.cardiganDark}" />
    </linearGradient>
    <radialGradient id="${character.id}-skin-fill" cx="0.42" cy="0.32" r="0.8">
      <stop stop-color="${character.skin}" />
      <stop offset="1" stop-color="${character.skinShade}" />
    </radialGradient>
  </defs>`;
}

function backHair(character) {
  const fill = `url(#${character.id}-hair-fill)`;
  const style = character.hairStyle;

  if (style === "short" || style === "spiky") {
    return `
  <path d="M122 212C122 128 160 84 210 84C260 84 298 128 298 212V270H122Z" fill="${fill}" />`;
  }

  if (style === "bun") {
    return `
  <ellipse cx="210" cy="86" rx="54" ry="42" fill="${fill}" />
  <path d="M126 210C126 130 160 90 210 90C260 90 294 130 294 210V270H126Z" fill="${fill}" />
  <path d="M168 100C184 82 236 82 252 100" fill="none" stroke="${character.hairDark}" stroke-width="6" opacity="0.55" />`;
  }

  if (style === "ponytail") {
    return `
  <path d="M112 214C112 122 154 74 210 74C266 74 308 122 308 214V420C308 462 272 486 210 486C148 486 112 462 112 420V214Z" fill="${fill}" />
  <path d="M292 156C338 172 356 236 350 314C345 386 330 442 306 486C318 426 318 358 308 296C300 244 286 196 264 170Z" fill="${fill}" />
  <ellipse cx="294" cy="154" rx="18" ry="12" fill="${character.accent}" opacity="0.9" />`;
  }

  return `
  <path d="M108 214C108 120 152 70 210 70C268 70 312 120 312 214V390C312 432 300 470 280 502C286 460 278 430 264 410C258 460 240 492 210 512C180 492 162 460 156 410C142 430 134 460 140 502C120 470 108 432 108 390V214Z" fill="${fill}" />`;
}

function bangs(character) {
  const fill = `url(#${character.id}-hair-fill)`;
  const style = character.hairStyle;

  if (style === "short") {
    return `
  <path d="M132 210C130 142 164 108 210 108C256 108 290 142 288 210C280 180 264 162 244 154C250 176 244 192 234 200C226 172 204 156 186 164C194 184 190 198 178 208C170 188 156 180 148 196C142 202 136 208 132 210Z" fill="${fill}" />`;
  }

  if (style === "spiky") {
    return `
  <path d="M132 210C130 142 164 108 210 108C256 108 290 142 288 210C280 180 264 162 244 154C250 176 244 192 234 200C226 172 204 156 186 164C194 184 190 198 178 208C170 188 156 180 148 196C142 202 136 208 132 210Z" fill="${fill}" />`;
  }

  if (style === "bun") {
    return `
  <path d="M126 212C124 136 160 96 210 96C258 96 294 136 292 212C282 174 262 152 240 146C248 176 242 196 230 204C222 174 204 158 188 164C196 186 190 200 178 210C168 186 152 178 144 196C138 204 132 210 126 212Z" fill="${fill}" />`;
  }

  if (style === "wavy") {
    return `
  <path d="M126 214C122 134 162 94 210 94C258 94 296 134 292 214C284 178 266 154 244 146C252 176 246 196 232 206C226 170 202 150 182 156C190 178 186 198 172 210C164 182 148 174 140 196C136 204 132 210 126 214Z" fill="${fill}" />`;
  }

  return `
  <path d="M126 214C122 136 160 96 210 96C258 96 296 134 292 214C284 178 264 154 240 146C248 178 238 198 224 208C220 174 198 154 180 158C190 180 184 200 170 212C162 184 146 176 138 198C134 206 130 212 126 214Z" fill="${fill}" />`;
}

function sideLocks(character) {
  const fill = `url(#${character.id}-hair-fill)`;
  const style = character.hairStyle;

  if (style === "short" || style === "spiky" || style === "bun") return "";

  if (style === "wavy") {
    return `
  <path d="M124 206C112 268 114 342 130 396C142 364 146 300 142 250C138 232 132 216 124 206Z" fill="${fill}" />
  <path d="M296 206C308 268 306 342 290 396C278 364 274 300 278 250C282 232 288 216 296 206Z" fill="${fill}" />`;
  }

  return `
  <path d="M128 206C118 262 118 330 132 382C142 354 144 294 142 248C138 230 134 216 128 206Z" fill="${fill}" />
  <path d="M292 206C302 262 302 330 288 382C278 354 276 294 278 248C282 230 286 216 292 206Z" fill="${fill}" />`;
}

function body(character) {
  const clothes = `url(#${character.id}-clothes-fill)`;

  if (character.hoodie) {
    return `
  <path d="M118 620C122 492 154 438 210 438C266 438 298 492 302 620H118Z" fill="${clothes}" />
  <path d="M146 442C160 486 260 486 274 442L292 492C262 530 158 530 128 492Z" fill="${character.hoodieDark}" />
  <path d="M170 438L210 470L250 438L266 620H154L170 438Z" fill="${character.shirt}" />
  <path d="M190 470V560" stroke="${character.accent}" stroke-width="5" stroke-linecap="round" opacity="0.8" />
  <path d="M230 470V560" stroke="${character.accent}" stroke-width="5" stroke-linecap="round" opacity="0.8" />
  <circle cx="190" cy="564" r="4" fill="${character.accent}" />
  <circle cx="230" cy="564" r="4" fill="${character.accent}" />`;
  }

  if (character.cardigan) {
    return `
  <path d="M118 620C122 492 154 438 210 438C266 438 298 492 302 620H118Z" fill="${clothes}" />
  <path d="M170 438L210 470L250 438L266 620H154L170 438Z" fill="${character.shirt}" />
  <path d="M168 440L210 470L196 500L160 462Z" fill="${character.shirt}" opacity="0.9" />
  <path d="M252 440L210 470L224 500L260 462Z" fill="${character.shirt}" opacity="0.75" />
  <path d="M196 500L210 470L224 500L214 620H206Z" fill="${character.cardiganDark}" opacity="0.7" />`;
  }

  const collar = `
  <path d="M170 438L210 470L196 500L160 462L170 438Z" fill="#fbf7f1" />
  <path d="M250 438L210 470L224 500L260 462L250 438Z" fill="#e6ded2" />`;

  const tie = character.tie
    ? `
  <path d="M210 470L198 500L206 554L214 554L222 500Z" fill="${character.accent}" />
  <path d="M198 500L210 512L222 500L210 492Z" fill="${character.accent}" opacity="0.7" />`
    : "";

  const ribbon = character.ribbon
    ? `
  <path d="M210 462L176 442L166 480L210 474Z" fill="${character.accent}" />
  <path d="M210 462L244 442L254 480L210 474Z" fill="${character.accent}" opacity="0.85" />
  <circle cx="210" cy="468" r="12" fill="${character.accent}" />
  <circle cx="206" cy="464" r="4" fill="#fff" opacity="0.35" />`
    : "";

  return `
  <path d="M118 620C122 492 154 438 210 438C266 438 298 492 302 620H118Z" fill="${clothes}" />
  <path d="M170 438L210 470L250 438L266 620H154L170 438Z" fill="${character.shirt}" />
  ${collar}
  ${tie}
  ${ribbon}`;
}

function brows(expression) {
  const left = {
    neutral: "",
    smile: "",
    happy: "",
    sad: ' transform="rotate(-8 175 204)"',
    surprised: ' transform="translate(0 -4) rotate(-5 175 204)"',
  }[expression];
  const right = {
    neutral: "",
    smile: "",
    happy: "",
    sad: ' transform="rotate(8 245 204)"',
    surprised: ' transform="translate(0 -4) rotate(5 245 204)"',
  }[expression];

  return `
  <path class="sp-brow sp-brow-left" d="M158 208C168 200 184 200 192 207" stroke="#4b2831" stroke-width="5" stroke-linecap="round"${left} />
  <path class="sp-brow sp-brow-right" d="M228 207C236 200 252 200 262 208" stroke="#4b2831" stroke-width="5" stroke-linecap="round"${right} />`;
}

function eyesOpen(character, expression) {
  const { iris = 11, pupil = 5.5, gazeY = 0, rx = 16, ry = 20 } =
    expression === "surprised"
      ? { iris: 10.5, pupil: 4.5, rx: 17, ry: 21.5 }
      : expression === "sad"
        ? { gazeY: 2 }
        : {};

  return `
  <g class="sp-eyes sp-eyes-open">
    <ellipse cx="175" cy="239" rx="${rx}" ry="${ry}" fill="#fffaf5" />
    <ellipse cx="245" cy="239" rx="${rx}" ry="${ry}" fill="#fffaf5" />
    <g class="sp-gaze" transform="translate(0 ${gazeY})">
      <circle cx="176" cy="241" r="${iris}" fill="${character.eyes}" />
      <circle cx="244" cy="241" r="${iris}" fill="${character.eyes}" />
      <circle cx="176" cy="242" r="${pupil}" fill="#2a1a22" />
      <circle cx="244" cy="242" r="${pupil}" fill="#2a1a22" />
      <circle cx="180" cy="235" r="4" fill="#fff" />
      <circle cx="248" cy="235" r="4" fill="#fff" />
      <circle cx="172" cy="246" r="2" fill="#ffe6c7" />
      <circle cx="240" cy="246" r="2" fill="#ffe6c7" />
    </g>
    <path d="M158 226C168 215 184 215 192 225" stroke="#3b2028" stroke-width="4.5" stroke-linecap="round" />
    <path d="M228 225C236 215 252 215 262 226" stroke="#3b2028" stroke-width="4.5" stroke-linecap="round" />
  </g>`;
}

const eyesHappy = `
  <g class="sp-eyes sp-eyes-happy">
    <path d="M158 242C168 228 184 228 192 242" stroke="#3b2028" stroke-width="5" stroke-linecap="round" />
    <path d="M228 242C236 228 252 228 262 242" stroke="#3b2028" stroke-width="5" stroke-linecap="round" />
  </g>`;

function eyelids(character) {
  return `
  <g class="sp-eyelids">
    <rect x="157" y="216" width="38" height="44" rx="19" fill="${character.skin}" transform="translate(0 238) scale(1 0) translate(0 -238)" />
    <rect x="227" y="216" width="38" height="44" rx="19" fill="${character.skin}" transform="translate(0 238) scale(1 0) translate(0 -238)" />
  </g>`;
}

function mouth(expression) {
  const shapes = {
    neutral: `<path d="M200 286C206 290 214 290 220 286" stroke="#8f4a52" stroke-width="4" stroke-linecap="round" />`,
    smile: `<path d="M195 282C202 296 218 296 225 282" stroke="#8f4a52" stroke-width="4.5" stroke-linecap="round" />`,
    happy: `
    <path d="M192 280C200 302 220 302 228 280C218 288 202 288 192 280Z" fill="#a85560" />
    <path d="M198 290C204 296 216 296 222 290" stroke="#f4b3b5" stroke-width="3" stroke-linecap="round" />`,
    sad: `<path d="M197 292C204 284 216 284 223 292" stroke="#8f4a52" stroke-width="4.5" stroke-linecap="round" />`,
    surprised: `<ellipse cx="210" cy="288" rx="7" ry="9" fill="#8f4a52" />`,
  };

  return `<g class="sp-mouth sp-mouth-${expression}">${shapes[expression]}</g>`;
}

function blush(expression) {
  const opacity = { neutral: 0.32, smile: 0.55, happy: 0.55, sad: 0.2, surprised: 0.25 }[expression];
  return `
  <ellipse class="sp-blush" cx="158" cy="269" rx="18" ry="8" fill="#f08a96" opacity="${opacity}" />
  <ellipse class="sp-blush" cx="262" cy="269" rx="18" ry="8" fill="#f08a96" opacity="${opacity}" />`;
}

function accessories(character, expression) {
  if (!character.glasses) return "";

  return `
  <g class="sp-glasses" fill="none" stroke="#5a453f" stroke-width="3" opacity="0.78">
    <ellipse cx="175" cy="239" rx="28" ry="24" />
    <ellipse cx="245" cy="239" rx="28" ry="24" />
    <path d="M203 239H217" />
    <path d="M147 232L132 226" />
    <path d="M273 232L288 226" />
  </g>`;
}

function sprite(character, expression) {
  const open = expression !== "happy";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="840"
  height="1240"
  viewBox="0 0 420 620"
  role="img"
  aria-labelledby="${character.id}-title ${character.id}-desc"
  data-character="${character.id}"
  data-expression="${expression}"
>
  <style>
    .sp-sprite {
      transform-box: fill-box;
      transform-origin: 50% 100%;
      animation: ${character.id}-breathe 7s ease-in-out infinite;
    }
    .sp-eyelids rect {
      transform-box: fill-box;
      transform-origin: center;
      animation: ${character.id}-blink 6.5s infinite;
    }
    @keyframes ${character.id}-breathe {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-2px) scale(1.006); }
    }
    @keyframes ${character.id}-blink {
      0%, 95.4%, 100% { transform: scaleY(0); }
      96.2%, 97.6% { transform: scaleY(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sp-sprite, .sp-eyelids rect { animation: none; }
    }
  </style>

  <title id="${character.id}-title">${character.name} — ${expression}</title>
  <desc id="${character.id}-desc">${character.name}, a character in Chavales Legales.</desc>
${defs(character)}

  <g class="sp-sprite">
${backHair(character)}

    <path d="M186 330H234V444C226 462 194 462 186 444V330Z" fill="${character.skinShade}" />
    <ellipse cx="133" cy="236" rx="12" ry="18" fill="${character.skin}" />
    <ellipse cx="287" cy="236" rx="12" ry="18" fill="${character.skin}" />
    <ellipse cx="210" cy="226" rx="78" ry="94" fill="url(#${character.id}-skin-fill)" />

${body(character)}
${bangs(character)}
${sideLocks(character)}
${brows(expression)}
${open ? eyesOpen(character, expression) : eyesHappy}
${open ? eyelids(character) : ""}
    <path d="M209 252C207 260 205 265 210 267" stroke="${character.skinShade}" stroke-width="3" stroke-linecap="round" />
${blush(expression)}
${mouth(expression)}
    <path d="M186 330H234V358C224 370 196 370 186 358V330Z" fill="${character.skinShade}" opacity="0.4" />
${accessories(character, expression)}
  </g>
</svg>
`;
}

for (const [id, character] of Object.entries(CHARACTERS)) {
  const outDir = path.join(outRoot, id);
  await mkdir(outDir, { recursive: true });

  for (const expression of EXPRESSIONS) {
    const file = path.join(outDir, `${expression}.svg`);
    await writeFile(file, sprite({ ...character, id }, expression), "utf8");
    console.log(`wrote ${path.relative(process.cwd(), file)}`);
  }
}
