import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { handleListCategories, listCategoriesShape } from "./tools/categories.js";
import {
  getPaperPdfUrlShape,
  getPaperShape,
  handleGetPaper,
  handleGetPaperPdfUrl,
} from "./tools/paper.js";
import { handleSearchPapers, searchPapersDescription, searchPapersShape } from "./tools/search.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "arxiv-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "search_papers",
    { description: searchPapersDescription, inputSchema: searchPapersShape },
    (args) => handleSearchPapers(args),
  );

  server.registerTool(
    "get_paper",
    {
      description:
        "Get detailed information about specific arXiv papers by their IDs. " +
        "Returns full metadata including title, authors, abstract, categories, and links.",
      inputSchema: getPaperShape,
    },
    (args) => handleGetPaper(args),
  );

  server.registerTool(
    "get_paper_pdf_url",
    {
      description: "Get the direct PDF download URL for an arXiv paper",
      inputSchema: getPaperPdfUrlShape,
    },
    (args) => handleGetPaperPdfUrl(args),
  );

  server.registerTool(
    "list_categories",
    {
      description: "List arXiv subject categories, optionally filtered by group",
      inputSchema: listCategoriesShape,
    },
    (args) => handleListCategories(args),
  );

  server.server.onerror = (error) => {
    console.error("[MCP Error]", error);
  };

  return server;
}
