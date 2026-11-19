import { z } from "zod";
import { getPaperById } from "../arxiv-client.js";
import { textResult, type ToolResult } from "../types.js";

// --- get_paper ---
export const getPaperShape = {
  ids: z
    .array(z.string())
    .describe("arXiv paper IDs (e.g. ['2301.07041', '1706.03762', 'cs/0112017'])"),
};

export async function handleGetPaper(args: { ids: string[] }): Promise<ToolResult> {
  const { ids } = args;
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
export const getPaperPdfUrlShape = {
  id: z.string().describe("arXiv paper ID (e.g. '2301.07041')"),
};

export async function handleGetPaperPdfUrl(args: { id: string }): Promise<ToolResult> {
  const { id } = args;
  // arXiv PDF URLs follow a predictable pattern
  const pdfUrl = `https://arxiv.org/pdf/${id}`;
  return textResult(pdfUrl);
}
