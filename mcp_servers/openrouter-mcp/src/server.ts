import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerChatTool } from "./tools/chat.js";
import { registerListModelsTool } from "./tools/list_models.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "openrouter-mcp",
    version: "0.1.0",
  });

  registerChatTool(server);
  registerListModelsTool(server);

  server.server.onerror = (error) => {
    console.error("[MCP Error]", error);
  };

  return server;
}
