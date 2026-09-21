import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Runs the documentation generators in ./scripts — see `npm run docs`. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["scripts/**/*.gen.ts"],
  },
});
