import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHelloTool } from "./tools/hello.js";
export function createServer() {
    const server = new McpServer({
        name: "template-server",
        version: "0.1.0",
    });
    // Register every tool here.
    registerHelloTool(server);
    return server;
}
//# sourceMappingURL=server.js.map