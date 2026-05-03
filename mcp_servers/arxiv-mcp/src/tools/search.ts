import { searchPapers } from "../arxiv-client.js";
import { textResult, type ToolResult } from "../types.js";

export const searchPapersTool = {
  name: "search_papers",
  description:
    "Search arXiv papers by query. Supports arXiv query syntax: " +
    "field prefixes (ti:, au:, abs:, cat:, all:), boolean operators (AND, OR, ANDNOT). " +
    "Examples: 'ti:attention AND au:vaswani', 'cat:cs.AI AND all:transformer'",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "Search query. Use arXiv syntax: ti: (title), au: (author), abs: (abstract), " +
          "cat: (category), all: (all fields). Example: 'all:large language model'",
      },
      maxResults: {
        type: "number",
        description: "Max papers to return (1-100, default: 10)",
      },
      start: {
        type: "number",
        description: "Pagination offset (default: 0)",
      },
      sortBy: {
        type: "string",
        enum: ["relevance", "lastUpdatedDate", "submittedDate"],
        description: "Sort field (default: relevance)",
      },
      sortOrder: {
        type: "string",
        enum: ["ascending", "descending"],
        description: "Sort direction (default: descending)",
      },
      categories: {
        type: "array",
        items: { type: "string" },
        description:
          "Filter by categories (e.g. ['cs.AI', 'cs.CL', 'stat.ML'])",
      },
    },
    required: ["query"],
  },
};

export async function handleSearchPapers(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const result = await searchPapers({
    query: args.query as string,
    maxResults: (args.maxResults as number) ?? 10,
    start: (args.start as number) ?? 0,
    sortBy: args.sortBy as "relevance" | "lastUpdatedDate" | "submittedDate" | undefined,
    sortOrder: args.sortOrder as "ascending" | "descending" | undefined,
    categories: args.categories as string[] | undefined,
  });

  if (result.papers.length === 0) {
    return textResult("No papers found for the given query.");
  }

  const header = `Found ${result.totalResults} papers (showing ${result.startIndex + 1}-${result.startIndex + result.papers.length}):\n`;

  const lines = result.papers.map((p, i) => {
    const num = result.startIndex + i + 1;
    return [
      `${num}. **${p.title}**`,
      `   ID: ${p.id}`,
      `   Authors: ${p.authors.join(", ")}`,
      `   Categories: ${p.categories.join(", ")}`,
      `   Published: ${p.published.slice(0, 10)}`,
      `   PDF: ${p.pdfUrl}`,
      `   Abstract: ${p.abstract.slice(0, 200)}${p.abstract.length > 200 ? "..." : ""}`,
    ].join("\n");
  });

  return textResult(header + lines.join("\n\n"));
}
