# MCP Server Template

Minimal template for creating new MCP servers. Copy this folder and start building.

## Quick Start

```bash
# 1. Copy the template
cp -r _template my-new-server

# 2. Update package.json name and description
cd my-new-server

# 3. Install dependencies and build
npm install
npm run build

# 4. Test with MCP Inspector
npm run inspect
```

## Adding Tools

1. Create a new file in `src/tools/` (use `hello.ts` as reference)
2. Define zod input/output shapes and export a `registerXxxTool(server)` function that calls `server.registerTool(name, { title, description, inputSchema, outputSchema }, handler)`
3. Return both `content` (text) and `structuredContent` (matching `outputSchema`)
4. Call `registerXxxTool(server)` in `src/server.ts`
5. Add a test in `src/*.test.ts` (see `server.test.ts`: in-memory client/transport pair)

## File Structure

```
src/
  index.ts        # stdio entry point (dist/index.js)
  http.ts         # optional Streamable HTTP entry (dist/http.js, stateless, loopback)
  server.ts       # createServer(): McpServer + tool registration
  server.test.ts  # vitest: listTools + callTool via InMemoryTransport
  tools/
    hello.ts      # Sample tool (delete after adding your own)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Watch mode compilation |
| `npm start` | Run the compiled server over stdio |
| `npm run start:http` | Run the Streamable HTTP entry on `127.0.0.1:3000/mcp` |
| `npm run typecheck` | Type check without emit |
| `npm test` | Run vitest for this workspace |
| `npm run inspect` | Launch MCP Inspector for testing |

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-new-server": {
      "command": "node",
      "args": ["/absolute/path/to/my-new-server/dist/index.js"],
      "env": {}
    }
  }
}
```
