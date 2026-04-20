# openrouter-mcp

MCP server that exposes the [OpenRouter](https://openrouter.ai) LLM API as tools.

## Tools

- `openrouter_chat` — send a chat completion request to any OpenRouter model.
- `openrouter_list_models` — list available models (with optional substring filter and limit).

## Setup

```bash
npm install
npm run build
```

## Environment

| Variable                | Required | Default                            |
| ----------------------- | -------- | ---------------------------------- |
| `OPENROUTER_API_KEY`    | yes      | —                                  |
| `OPENROUTER_BASE_URL`   | no       | `https://openrouter.ai/api/v1`     |
| `OPENROUTER_REFERER`    | no       | (sent as `HTTP-Referer` header)    |
| `OPENROUTER_TITLE`      | no       | (sent as `X-Title` header)         |

## Claude Desktop config

```json
{
  "mcpServers": {
    "openrouter": {
      "command": "node",
      "args": ["D:/work/mcp_server/mcp_servers/openrouter-mcp/dist/index.js"],
      "env": { "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}" }
    }
  }
}
```

## Verify

```bash
OPENROUTER_API_KEY=sk-... npm run inspect
```
