export interface ToolResult {
  [key: string]: unknown;
  content: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  >;
  isError?: boolean;
}

export interface PageInfo {
  pageId: number;
  url: string;
  title: string;
  selected: boolean;
}

export interface ConsoleEntry {
  msgid: number;
  type: string;
  text: string;
  timestamp: number;
  url?: string;
  lineNumber?: number;
}

export interface NetworkEntry {
  reqid: number;
  url: string;
  method: string;
  resourceType: string;
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  timing?: { startTime: number; endTime?: number };
}

export type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<ToolResult>;

export function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

export function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export function imageResult(base64: string, mimeType = "image/png"): ToolResult {
  return { content: [{ type: "image", data: base64, mimeType }] };
}
