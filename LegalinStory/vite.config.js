import { defineConfig } from "vite";
import { validateContent } from "./scripts/validate-content.mjs";

const formatErrors = (errors) =>
  `Content validation failed:\n${errors.map((error) => `  - ${error}`).join("\n")}`;

export default defineConfig({
  plugins: [
    {
      name: "validate-content-serve",
      apply: "serve",
      async configureServer(server) {
        const report = await validateContent();
        for (const warning of report.warnings) {
          server.config.logger.warn(`content: ${warning}`);
        }
        if (!report.ok) {
          throw new Error(formatErrors(report.errors));
        }
        server.config.logger.info(
          `content validated: ${report.stats.stories} stories, ${report.stats.nodes} nodes, ${report.stats.assets} assets`,
        );
      },
    },
    {
      name: "validate-content-build",
      apply: "build",
      async buildStart() {
        const report = await validateContent();
        for (const warning of report.warnings) {
          this.warn(`content: ${warning}`);
        }
        if (!report.ok) {
          throw new Error(formatErrors(report.errors));
        }
      },
    },
  ],
});
