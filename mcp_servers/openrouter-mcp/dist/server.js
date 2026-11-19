import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerChatTool } from "./tools/chat.js";
import { registerListModelsTool } from "./tools/list_models.js";
export function createServer() {
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
//# sourceMappingURL=server.js.map