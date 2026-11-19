import { z } from "zod";
import { browserManager } from "../browser-manager.js";
import { defineTool, textResult } from "../types.js";

export const listConsoleMessagesTool = defineTool({
  name: "list_console_messages",
  description: "List console messages captured from the browser page",
  inputSchema: {
    pageId: z.number().optional().describe("Page ID (default: selected page)"),
    types: z
      .array(z.string())
      .optional()
      .describe("Filter by message types (e.g. ['error', 'warning', 'log'])"),
    limit: z.number().optional().describe("Max messages to return (default: 50)"),
  },
  handler: async ({ pageId, types, limit }) => {
    await browserManager.ensureConnected();
    let messages = browserManager.getConsoleMessages(pageId);

    if (types?.length) {
      messages = messages.filter((m) => types.includes(m.type));
    }

    messages = messages.slice(-(limit ?? 50));

    if (messages.length === 0) {
      return textResult("No console messages captured.");
    }

    const lines = messages.map(
      (m) =>
        `[${m.msgid}] ${m.type.toUpperCase()} ${m.text}${m.url ? ` (${m.url}:${m.lineNumber})` : ""}`,
    );
    return textResult(lines.join("\n"));
  },
});

export const getConsoleMessageTool = defineTool({
  name: "get_console_message",
  description: "Get a specific console message by ID",
  inputSchema: {
    msgid: z.number().describe("Message ID"),
    pageId: z.number().optional().describe("Page ID (default: selected page)"),
  },
  handler: async ({ msgid, pageId }) => {
    await browserManager.ensureConnected();
    const messages = browserManager.getConsoleMessages(pageId);
    const msg = messages.find((m) => m.msgid === msgid);

    if (!msg) {
      return textResult(`Console message ${msgid} not found.`);
    }

    return textResult(JSON.stringify(msg, null, 2));
  },
});

export const consoleTools = [listConsoleMessagesTool, getConsoleMessageTool];
