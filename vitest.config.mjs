import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Only collect tests from declared npm workspaces (and the root tests/ dir),
// so git-ignored vendored clones under mcp_servers/ are never picked up.
const { workspaces = [] } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,mjs}", ...workspaces.map((ws) => `${ws}/src/**/*.test.ts`)],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
