/**
 * Builds standalone Hana sprites, one SVG per expression.
 *
 * The markup is generated from a single body template so the five files can
 * never drift apart. Output is committed to public/assets/characters/hana/,
 * where Vite serves it at /assets/characters/hana/<expression>.svg.
 *
 *   node scripts/build-hana-svgs.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../public/assets/characters/hana");

const DEFS = `
  <defs>
    <linearGradient id="hana-hair-fill" x1="210" y1="70" x2="210" y2="500" gradientUnits="userSpaceOnUse">
      <stop stop-color="#8e4e5b" />
      <stop offset="1" stop-color="#542d39" />
    </linearGradient>
    <linearGradient id="hana-blazer-fill" x1="210" y1="430" x2="210" y2="620" gradientUnits="userSpaceOnUse">
      <stop stop-color="#343a60" />
      <stop offset="1" stop-color="#202440" />
    </linearGradient>
    <radialGradient id="hana-skin-fill" cx="0.42" cy="0.32" r="0.8">
      <stop stop-color="#f9ddc9" />
      <stop offset="1" stop-color="#efc3ad" />
    </radialGradient>
  </defs>`;

const BODY = `
  <!-- back hair -->
  <path d="M112 214C112 122 154 74 210 74C266 74 308 122 308 214V420C308 462 272 486 210 486C148 486 112 462 112 420V214Z" fill="url(#hana-hair-fill)" />

  <!-- neck -->
  <path d="M186 330H234V444C226 462 194 462 186 444V330Z" fill="#e8bca6" />

  <!-- ears -->
  <ellipse cx="133" cy="236" rx="12" ry="18" fill="#f1cbb6" />
  <ellipse cx="287" cy="236" rx="12" ry="18" fill="#f1cbb6" />

  <!-- face -->
  <ellipse cx="210" cy="226" rx="78" ry="94" fill="url(#hana-skin-fill)" />

  <!-- shoulders / blazer -->
  <path d="M118 620C122 492 154 438 210 438C266 438 298 492 302 620H118Z" fill="url(#hana-blazer-fill)" />

  <!-- shirt -->
  <path d="M170 438L210 470L250 438L266 620H154L170 438Z" fill="#f3ede4" />

  <!-- collar -->
  <path d="M170 438L210 470L196 500L160 462L170 438Z" fill="#fbf7f1" />
  <path d="M250 438L210 470L224 500L260 462L250 438Z" fill="#e6ded2" />

  <!-- bangs -->
  <path d="M128 214C124 132 162 94 210 94C258 94 296 132 292 214C284 178 266 154 244 146C252 176 244 196 232 206C226 170 200 150 180 156C188 178 184 198 170 210C164 182 148 174 140 198C136 204 132 210 128 214Z" fill="url(#hana-hair-fill)" />

  <!-- side locks -->
  <path d="M128 206C118 262 118 330 132 382C142 354 144 294 142 248C138 230 134 216 128 206Z" fill="url(#hana-hair-fill)" />
  <path d="M292 206C302 262 302 330 288 382C278 354 276 294 278 248C282 230 286 216 292 206Z" fill="url(#hana-hair-fill)" />`;

const NOSE = `
  <!-- nose -->
  <path d="M209 252C207 260 205 265 210 267" stroke="#d9a48c" stroke-width="3" stroke-linecap="round" />`;

const NECK_SHADOW = `
  <!-- neck shadow -->
  <path d="M186 330H234V358C224 370 196 370 186 358V330Z" fill="#dda892" opacity=".45" />`;

const RIBBON = `
  <!-- ribbon -->
  <g class="hana-ribbon">
    <path d="M210 462L176 442L166 480L210 474Z" fill="#c65d73" />
    <path d="M210 462L244 442L254 480L210 474Z" fill="#d36b80" />
    <circle cx="210" cy="468" r="12" fill="#e07f92" />
    <circle cx="206" cy="464" r="4" fill="#f6b6c0" opacity=".7" />
  </g>`;

const STYLE = `
  <style>
    .hana-sprite {
      transform-box: fill-box;
      transform-origin: 50% 100%;
      animation: hana-breathe 7s ease-in-out infinite;
    }
    .hana-eyelids rect {
      transform-box: fill-box;
      transform-origin: center;
      animation: hana-blink 6.5s infinite;
    }
    @keyframes hana-breathe {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-2px) scale(1.006); }
    }
    @keyframes hana-blink {
      0%, 95.4%, 100% { transform: scaleY(0); }
      96.2%, 97.6% { transform: scaleY(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .hana-sprite, .hana-eyelids rect { animation: none; }
    }
  </style>`;

function brows(expression) {
  const left = {
    neutral: "",
    happy: "",
    sad: ' transform="rotate(-8 175 204)"',
    surprised: ' transform="translate(0 -4) rotate(-5 175 204)"',
  }[expression];
  const right = {
    neutral: "",
    happy: "",
    sad: ' transform="rotate(8 245 204)"',
    surprised: ' transform="translate(0 -4) rotate(5 245 204)"',
  }[expression];

  return `
  <!-- eyebrows -->
  <path class="hana-brow hana-brow-left" d="M158 208C168 200 184 200 192 207" stroke="#4b2831" stroke-width="5" stroke-linecap="round"${left} />
  <path class="hana-brow hana-brow-right" d="M228 207C236 200 252 200 262 208" stroke="#4b2831" stroke-width="5" stroke-linecap="round"${right} />`;
}

function eyesOpen({ iris = 11, pupil = 5.5, gazeY = 0, rx = 16, ry = 20 } = {}) {
  return `
  <!-- eyes -->
  <g class="hana-eyes hana-eyes-open">
    <ellipse cx="175" cy="239" rx="${rx}" ry="${ry}" fill="#fffaf5" />
    <ellipse cx="245" cy="239" rx="${rx}" ry="${ry}" fill="#fffaf5" />
    <g class="hana-gaze" transform="translate(0 ${gazeY})">
      <circle cx="176" cy="241" r="${iris}" fill="#b9713c" />
      <circle cx="244" cy="241" r="${iris}" fill="#b9713c" />
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

const EYES_HAPPY = `
  <!-- happy closed eyes -->
  <g class="hana-eyes hana-eyes-happy">
    <path d="M158 242C168 228 184 228 192 242" stroke="#3b2028" stroke-width="5" stroke-linecap="round" />
    <path d="M228 242C236 228 252 228 262 242" stroke="#3b2028" stroke-width="5" stroke-linecap="round" />
  </g>`;

const EYELIDS = `
  <!-- blinking lids (hidden unless the blink animation runs) -->
  <g class="hana-eyelids">
    <rect x="157" y="216" width="38" height="44" rx="19" fill="#f1cbb6" transform="translate(0 238) scale(1 0) translate(0 -238)" />
    <rect x="227" y="216" width="38" height="44" rx="19" fill="#f1cbb6" transform="translate(0 238) scale(1 0) translate(0 -238)" />
  </g>`;

const BLUSH = (opacity) => `
  <!-- blush -->
  <ellipse class="hana-blush" cx="158" cy="269" rx="18" ry="8" fill="#f08a96" opacity="${opacity}" />
  <ellipse class="hana-blush" cx="262" cy="269" rx="18" ry="8" fill="#f08a96" opacity="${opacity}" />`;

function mouth(expression) {
  const shapes = {
    neutral: `
    <path d="M200 286C206 290 214 290 220 286" stroke="#8f4a52" stroke-width="4" stroke-linecap="round" />`,
    smile: `
    <path d="M195 282C202 296 218 296 225 282" stroke="#8f4a52" stroke-width="4.5" stroke-linecap="round" />`,
    happy: `
    <path d="M192 280C200 302 220 302 228 280C218 288 202 288 192 280Z" fill="#a85560" />
    <path d="M198 290C204 296 216 296 222 290" stroke="#f4b3b5" stroke-width="3" stroke-linecap="round" />`,
    sad: `
    <path d="M197 292C204 284 216 284 223 292" stroke="#8f4a52" stroke-width="4.5" stroke-linecap="round" />`,
    surprised: `
    <ellipse cx="210" cy="288" rx="7" ry="9" fill="#8f4a52" />`,
  };

  return `
  <!-- mouth -->
  <g class="hana-mouth hana-mouth-${expression}">${shapes[expression]}
  </g>`;
}

const EXPRESSIONS = {
  neutral: {
    label: "Neutral",
    description: "Hana looking at the viewer with a calm, neutral expression.",
    brows: "neutral",
    eyes: eyesOpen(),
    eyelids: EYELIDS,
    blush: 0.32,
    mouth: "neutral",
  },
  smile: {
    label: "Smile",
    description: "Hana smiling gently.",
    brows: "neutral",
    eyes: eyesOpen(),
    eyelids: EYELIDS,
    blush: 0.55,
    mouth: "smile",
  },
  happy: {
    label: "Happy",
    description: "Hana beaming with her eyes closed.",
    brows: "happy",
    eyes: EYES_HAPPY,
    eyelids: "",
    blush: 0.55,
    mouth: "happy",
  },
  sad: {
    label: "Sad",
    description: "Hana looking down with a worried, sad expression.",
    brows: "sad",
    eyes: eyesOpen({ gazeY: 2 }),
    eyelids: EYELIDS,
    blush: 0.2,
    mouth: "sad",
  },
  surprised: {
    label: "Surprised",
    description: "Hana with raised brows, wide eyes, and a small open mouth.",
    brows: "surprised",
    eyes: eyesOpen({ iris: 10.5, pupil: 4.5, rx: 17, ry: 21.5 }),
    eyelids: EYELIDS,
    blush: 0.25,
    mouth: "surprised",
  },
};

function svg(expression, spec) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="840"
  height="1240"
  viewBox="0 0 420 620"
  role="img"
  aria-labelledby="hana-title hana-desc"
  data-character="hana"
  data-expression="${expression}"
>${STYLE}

  <title id="hana-title">Hana — ${spec.label}</title>
  <desc id="hana-desc">${spec.description}</desc>
${DEFS}

  <g class="hana-sprite">${BODY}
${brows(spec.brows)}
${spec.eyes}
${spec.eyelids}
${NOSE}
${BLUSH(spec.blush)}
${mouth(spec.mouth)}
${NECK_SHADOW}
${RIBBON}
  </g>
</svg>
`;
}

await mkdir(outDir, { recursive: true });

for (const [expression, spec] of Object.entries(EXPRESSIONS)) {
  const file = path.join(outDir, `${expression}.svg`);
  await writeFile(file, svg(expression, spec), "utf8");
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
