/**
 * Proves the startup validator fails on a broken asset tree.
 *
 * Copies public/ to a temp directory, removes one background, and checks that
 * validateContent reports it as a missing file instead of starting clean.
 */
import { cp, mkdtemp, rm, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateContent } from "./validate-content.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "legalinstory-validate-"));

try {
  await cp(path.join(projectRoot, "public"), path.join(tempRoot, "public"), {
    recursive: true,
  });
  await unlink(path.join(tempRoot, "public/assets/backgrounds/photos/library.jpg"));

  const report = await validateContent({ root: tempRoot });

  if (report.ok) {
    throw new Error("validator accepted a missing background asset");
  }

  const missing = report.errors.find(
    (error) => error.includes("backgrounds/clubroom") && error.includes("missing file"),
  );
  if (!missing) {
    throw new Error(
      `missing asset was not reported:\n${report.errors.map((error) => `  - ${error}`).join("\n")}`,
    );
  }

  console.log("Validation smoke test passed");
  console.log("reported:", missing);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
