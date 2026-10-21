// Publish the existing standalone engine alongside Next.js, using the same origin.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const result = spawnSync("npm", ["run", "build", "--", "--base=./", "--outDir=../frontend/public/novela"], {
  cwd: fileURLToPath(new URL("../../LegalinStory", import.meta.url)),
  stdio: "inherit",
  shell: true,
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
