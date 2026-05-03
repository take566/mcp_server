import { browserManager } from "../browser-manager.js";
import { textResult, type ToolResult } from "../types.js";

// --- navigate_page ---
export const navigatePageTool = {
  name: "navigate_page",
  description: "Navigate the selected page to a URL",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: { type: "string", description: "URL to navigate to" },
      waitUntil: {
        type: "string",
        enum: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
        description: "When to consider navigation complete (default: domcontentloaded)",
      },
    },
    required: ["url"],
  },
};

export async function handleNavigatePage(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const url = args.url as string;
  const waitUntil = (args.waitUntil as "load" | "domcontentloaded" | "networkidle0" | "networkidle2") ?? "domcontentloaded";
  await browserManager.navigate(url, waitUntil);
  const page = await browserManager.getSelectedPage();
  return textResult(`Navigated to ${page.url()} - "${await page.title()}"`);
}

// --- new_page ---
export const newPageTool = {
  name: "new_page",
  description: "Open a new browser tab, optionally navigating to a URL",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: { type: "string", description: "Optional URL to navigate to" },
    },
  },
};

export async function handleNewPage(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const info = await browserManager.newPage(args.url as string | undefined);
  return textResult(JSON.stringify(info, null, 2));
}

// --- close_page ---
export const closePageTool = {
  name: "close_page",
  description: "Close a browser tab by page ID",
  inputSchema: {
    type: "object" as const,
    properties: {
      pageId: { type: "number", description: "ID of the page to close" },
    },
    required: ["pageId"],
  },
};

export async function handleClosePage(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  await browserManager.closePage(args.pageId as number);
  return textResult(`Page ${args.pageId} closed.`);
}

// --- list_pages ---
export const listPagesTool = {
  name: "list_pages",
  description: "List all open browser tabs with their IDs, URLs, and titles",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
};

export async function handleListPages(): Promise<ToolResult> {
  const pages = await browserManager.listPages();
  return textResult(JSON.stringify(pages, null, 2));
}

// --- select_page ---
export const selectPageTool = {
  name: "select_page",
  description: "Switch to a specific browser tab by page ID",
  inputSchema: {
    type: "object" as const,
    properties: {
      pageId: { type: "number", description: "ID of the page to select" },
    },
    required: ["pageId"],
  },
};

export async function handleSelectPage(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const info = await browserManager.selectPage(args.pageId as number);
  return textResult(JSON.stringify(info, null, 2));
}
