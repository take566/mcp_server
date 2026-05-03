import { getPaperById } from "../arxiv-client.js";
import { textResult, type ToolResult } from "../types.js";

// --- get_paper ---
export const getPaperTool = {
  name: "get_paper",
  description:
    "Get detailed information about specific arXiv papers by their IDs. " +
    "Returns full metadata including title, authors, abstract, categories, and links.",
  inputSchema: {
    type: "object" as const,
    properties: {
      ids: {
        type: "array",
        items: { type: "string" },
        description:
          "arXiv paper IDs (e.g. ['2301.07041', '1706.03762', 'cs/0112017'])",
      },
    },
    required: ["ids"],
  },
};

export async function handleGetPaper(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const ids = args.ids as string[];
  const papers = await getPaperById(ids);

  if (papers.length === 0) {
    return textResult("No papers found for the given IDs.");
  }

  const output = papers
    .map((p) => {
      const lines = [
        `# ${p.title}`,
        ``,
        `**ID:** ${p.id}`,
        `**Authors:** ${p.authors.join(", ")}`,
        `**Published:** ${p.published.slice(0, 10)} | **Updated:** ${p.updated.slice(0, 10)}`,
        `**Categories:** ${p.categories.join(", ")} (primary: ${p.primaryCategory})`,
        `**PDF:** ${p.pdfUrl}`,
        `**Abstract page:** ${p.abstractUrl}`,
      ];
      if (p.doi) lines.push(`**DOI:** ${p.doi}`);
      if (p.journalRef) lines.push(`**Journal:** ${p.journalRef}`);
      if (p.comment) lines.push(`**Comment:** ${p.comment}`);
      lines.push(``, `## Abstract`, ``, p.abstract);
      return lines.join("\n");
    })
    .join("\n\n---\n\n");

  return textResult(output);
}

// --- get_paper_pdf_url ---
export const getPaperPdfUrlTool = {
  name: "get_paper_pdf_url",
  description: "Get the direct PDF download URL for an arXiv paper",
  inputSchema: {
    type: "object" as const,
    properties: {
      id: {
        type: "string",
        description: "arXiv paper ID (e.g. '2301.07041')",
      },
    },
    required: ["id"],
  },
};

export async function handleGetPaperPdfUrl(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const id = args.id as string;
  // arXiv PDF URLs follow a predictable pattern
  const pdfUrl = `https://arxiv.org/pdf/${id}`;
  return textResult(pdfUrl);
}
