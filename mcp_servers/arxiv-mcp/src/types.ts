export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  primaryCategory: string;
  published: string;
  updated: string;
  pdfUrl: string;
  abstractUrl: string;
  comment?: string;
  journalRef?: string;
  doi?: string;
}

export interface SearchResult {
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  papers: Paper[];
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

export function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

export function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
