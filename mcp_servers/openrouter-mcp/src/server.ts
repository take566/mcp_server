import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chatTool, handleChat } from "./tools/chat.js";
import { listModelsTool, handleListModels } from "./tools/list_models.js";

export function createServer(): Server {
  const server = new Server(
    {
      name: "openrouter-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [chatTool, listModelsTool],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case chatTool.name:
        return handleChat(args);
      case listModelsTool.name:
        return handleListModels(args);
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  });

  server.onerror = (error) => {
    console.error("[MCP Error]", error);
  };

  return server;
}
