npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-brave-search
npm install -g @notionhq/notion-mcp-server
npm install -g @modelcontextprotocol/server-github
npm install -g @smithery/cli@latest

claude mcp add -s project github_copilot -- npx @github/copilot --allow-npx
claude mcp add -s project gemini-cli -- npx @choplin/mcp-gemini-cli --allow-npx
claude mcp add playwright -s project -- npx -y @playwright/mcp@latest
claude mcp add markitdown -s project -- uvx markitdown-mcp
claude mcp add context7 -s project -- npx -y @upstash/context7-mcp
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest


