// Publish the existing standalone engine alongside Next.js, using the same origin.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const imageSource = fileURLToPath(new URL("../../images/", import.meta.url));
const imageTarget = fileURLToPath(new URL("../public/images/", import.meta.url));
mkdirSync(imageTarget, { recursive: true });
for (const filename of readdirSync(imageSource)) {
  if (filename.toLowerCase().endsWith(".png")) {
    copyFileSync(`${imageSource}${filename}`, `${imageTarget}${filename}`);
  }
}

const result = spawnSync("npm", ["run", "build", "--", "--base=./", "--outDir=../frontend/public/novela"], {
  cwd: fileURLToPath(new URL("../../LegalinStory", import.meta.url)),
  stdio: "inherit",
  shell: true,
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
