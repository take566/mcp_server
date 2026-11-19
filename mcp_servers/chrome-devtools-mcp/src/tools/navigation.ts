import { z } from "zod";
import { browserManager } from "../browser-manager.js";
import { defineTool, textResult } from "../types.js";

export const navigatePageTool = defineTool({
  name: "navigate_page",
  description: "Navigate the selected page to a URL",
  inputSchema: {
    url: z.string().describe("URL to navigate to"),
    waitUntil: z
      .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
      .optional()
      .describe("When to consider navigation complete (default: domcontentloaded)"),
  },
  handler: async ({ url, waitUntil }) => {
    await browserManager.navigate(url, waitUntil ?? "domcontentloaded");
    const page = await browserManager.getSelectedPage();
    return textResult(`Navigated to ${page.url()} - "${await page.title()}"`);
  },
});

export const newPageTool = defineTool({
  name: "new_page",
  description: "Open a new browser tab, optionally navigating to a URL",
  inputSchema: {
    url: z.string().optional().describe("Optional URL to navigate to"),
  },
  handler: async ({ url }) => {
    const info = await browserManager.newPage(url);
    return textResult(JSON.stringify(info, null, 2));
  },
});

export const closePageTool = defineTool({
  name: "close_page",
  description: "Close a browser tab by page ID",
  inputSchema: {
    pageId: z.number().describe("ID of the page to close"),
  },
  handler: async ({ pageId }) => {
    await browserManager.closePage(pageId);
    return textResult(`Page ${pageId} closed.`);
  },
});

export const listPagesTool = defineTool({
  name: "list_pages",
  description: "List all open browser tabs with their IDs, URLs, and titles",
  inputSchema: {},
  handler: async () => {
    const pages = await browserManager.listPages();
    return textResult(JSON.stringify(pages, null, 2));
  },
});

export const selectPageTool = defineTool({
  name: "select_page",
  description: "Switch to a specific browser tab by page ID",
  inputSchema: {
    pageId: z.number().describe("ID of the page to select"),
  },
  handler: async ({ pageId }) => {
    const info = await browserManager.selectPage(pageId);
    return textResult(JSON.stringify(info, null, 2));
  },
});

export const navigationTools = [
  navigatePageTool,
  newPageTool,
  closePageTool,
  listPagesTool,
  selectPageTool,
];
