#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio");

  // Graceful shutdown
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      console.error(`Received ${signal}, shutting down...`);
      server.close().finally(() => process.exit(0));
    });
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
