import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { helloTool, handleHello } from "./tools/hello.js";
export function createServer() {
    const server = new Server({
        name: "template-server",
        version: "0.1.0",
    }, {
        capabilities: {
            tools: {},
        },
    });
    // --- Tool List -----------------------------------------------------------
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [helloTool],
    }));
    // --- Tool Dispatch --------------------------------------------------------
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        switch (name) {
            case helloTool.name:
                return handleHello(args);
            default:
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
    });
    // --- Error Handling -------------------------------------------------------
    server.onerror = (error) => {
        console.error("[MCP Error]", error);
    };
    return server;
}
//# sourceMappingURL=server.js.map