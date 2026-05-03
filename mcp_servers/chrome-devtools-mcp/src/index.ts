#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { browserManager } from "./browser-manager.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Chrome DevTools MCP server running on stdio");
}

async function shutdown(): Promise<void> {
  console.error("Shutting down...");
  await browserManager.disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
