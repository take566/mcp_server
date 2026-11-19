#!/usr/bin/env node
// Optional Streamable HTTP entry (stateless). Run with: npm run start:http
// Binds to loopback only and rejects foreign Host headers (DNS-rebinding guard).
// Put an authenticating proxy in front for any remote use.
import { createServer as createHttpServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid PORT: ${process.env.PORT}`);
    process.exit(1);
}
const host = process.env.HOST ?? "127.0.0.1";
const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]);
function sendJsonRpcError(res, status, code, message) {
    if (res.headersSent)
        return;
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }));
}
const httpServer = createHttpServer(async (req, res) => {
    if (!req.headers.host || !allowedHosts.has(req.headers.host)) {
        sendJsonRpcError(res, 403, -32000, "Forbidden host");
        return;
    }
    if (new URL(req.url ?? "/", "http://localhost").pathname !== "/mcp") {
        res.writeHead(404).end();
        return;
    }
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        sendJsonRpcError(res, 405, -32000, "Method not allowed");
        return;
    }
    // Stateless mode: a fresh server + transport per request.
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
        server.close().catch((error) => console.error("Error closing server:", error));
    });
    try {
        await server.connect(transport);
        await transport.handleRequest(req, res);
    }
    catch (error) {
        console.error("Error handling MCP request:", error);
        sendJsonRpcError(res, 500, -32603, "Internal server error");
    }
});
httpServer.listen(port, host, () => {
    console.error(`MCP server listening on http://${host}:${port}/mcp`);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        httpServer.close(() => process.exit(0));
        httpServer.closeAllConnections();
    });
}
//# sourceMappingURL=http.js.map