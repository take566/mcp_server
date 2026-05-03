import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ToolHandler } from "./types.js";

import { searchPapersTool, handleSearchPapers } from "./tools/search.js";
import { getPaperTool, handleGetPaper, getPaperPdfUrlTool, handleGetPaperPdfUrl } from "./tools/paper.js";
import { listCategoriesTool, handleListCategories } from "./tools/categories.js";

const allTools = [
  searchPapersTool,
  getPaperTool,
  getPaperPdfUrlTool,
  listCategoriesTool,
];

const handlers: Record<string, ToolHandler> = {
  search_papers: handleSearchPapers,
  get_paper: handleGetPaper,
  get_paper_pdf_url: handleGetPaperPdfUrl,
  list_categories: handleListCategories,
};

export function createServer(): Server {
  const server = new Server(
    {
      name: "arxiv-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = handlers[name];

    if (!handler) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      return await handler(args ?? {});
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
  });

  server.onerror = (error) => {
    console.error("[MCP Error]", error);
  };

  return server;
}
