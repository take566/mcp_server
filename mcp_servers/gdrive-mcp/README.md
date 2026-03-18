# gdrive-mcp

MCP server for Google Drive integration. Provides file search and resource browsing via the Google Drive API.

## Tools

| Tool | Description |
|------|-------------|
| `search` | Search files in Google Drive |

## Resources

- Lists files from Google Drive as MCP resources
- Reads file content (with Google Docs export to plain text)

## Setup

```bash
npm install
npm run build
```

### Authentication

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Set environment variables or place credentials file:

```bash
export GDRIVE_CREDENTIALS_PATH=/path/to/.gdrive-server-credentials.json
```

3. Run the auth flow:

```bash
npm run auth
```

## Usage

```bash
node dist/index.js
```

## Claude Desktop Config

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "node",
      "args": ["path/to/mcp_servers/gdrive-mcp/dist/index.js"],
      "env": {
        "GDRIVE_CREDENTIALS_PATH": "/path/to/credentials.json"
      }
    }
  }
}
```
