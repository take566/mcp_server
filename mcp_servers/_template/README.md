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
2. Define the zod schema, tool definition, and handler function
3. Import and register the tool in `src/server.ts`:
   - Add to the `tools` array in `ListToolsRequestSchema` handler
   - Add a `case` in the `CallToolRequestSchema` switch

## File Structure

```
src/
  index.ts       # Entry point - stdio transport and graceful shutdown
  server.ts      # Server config, capabilities, tool registration
  tools/
    hello.ts     # Sample tool (delete after adding your own)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Watch mode compilation |
| `npm start` | Run the compiled server |
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
