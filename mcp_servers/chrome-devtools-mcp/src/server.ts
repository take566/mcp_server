import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDef, ToolResult } from "./types.js";
import { consoleTools } from "./tools/console.js";
import { emulationTools } from "./tools/emulation.js";
import { inspectionTools } from "./tools/inspection.js";
import { interactionTools } from "./tools/interaction.js";
import { navigationTools } from "./tools/navigation.js";
import { networkTools } from "./tools/network.js";
import { performanceTools } from "./tools/performance.js";
import { scriptingTools } from "./tools/scripting.js";

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous zod shapes per tool
export const allTools: ToolDef<any>[] = [
  ...navigationTools,
  ...interactionTools,
  ...inspectionTools,
  ...scriptingTools,
  ...consoleTools,
  ...networkTools,
  ...emulationTools,
  ...performanceTools,
];

export function createServer(): McpServer {
  const server = new McpServer({
    name: "chrome-devtools-mcp",
    version: "0.1.0",
  });

  for (const tool of allTools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (args: Record<string, unknown>): Promise<ToolResult> => {
        try {
          return await tool.handler(args);
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  server.server.onerror = (error) => {
    console.error("[MCP Error]", error);
  };

  return server;
}
