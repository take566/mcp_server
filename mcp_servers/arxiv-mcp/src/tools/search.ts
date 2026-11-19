import { z } from "zod";
import { searchPapers } from "../arxiv-client.js";
import { type ToolResult, textResult } from "../types.js";

export const searchPapersDescription =
  "Search arXiv papers by query. Supports arXiv query syntax: " +
  "field prefixes (ti:, au:, abs:, cat:, all:), boolean operators (AND, OR, ANDNOT). " +
  "Examples: 'ti:attention AND au:vaswani', 'cat:cs.AI AND all:transformer'";

export const searchPapersShape = {
  query: z
    .string()
    .describe(
      "Search query. Use arXiv syntax: ti: (title), au: (author), abs: (abstract), " +
        "cat: (category), all: (all fields). Example: 'all:large language model'",
    ),
  maxResults: z.number().optional().describe("Max papers to return (1-100, default: 10)"),
  start: z.number().optional().describe("Pagination offset (default: 0)"),
  sortBy: z
    .enum(["relevance", "lastUpdatedDate", "submittedDate"])
    .optional()
    .describe("Sort field (default: relevance)"),
  sortOrder: z
    .enum(["ascending", "descending"])
    .optional()
    .describe("Sort direction (default: descending)"),
  categories: z
    .array(z.string())
    .optional()
    .describe("Filter by categories (e.g. ['cs.AI', 'cs.CL', 'stat.ML'])"),
};

export type SearchPapersArgs = z.infer<z.ZodObject<typeof searchPapersShape>>;

export async function handleSearchPapers(args: SearchPapersArgs): Promise<ToolResult> {
  const result = await searchPapers({
    query: args.query,
    maxResults: args.maxResults ?? 10,
    start: args.start ?? 0,
    sortBy: args.sortBy,
    sortOrder: args.sortOrder,
    categories: args.categories,
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
