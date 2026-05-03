import { browserManager } from "../browser-manager.js";
import { textResult, type ToolResult } from "../types.js";

// --- list_console_messages ---
export const listConsoleMessagesTool = {
  name: "list_console_messages",
  description: "List console messages captured from the browser page",
  inputSchema: {
    type: "object" as const,
    properties: {
      pageId: { type: "number", description: "Page ID (default: selected page)" },
      types: {
        type: "array",
        items: { type: "string" },
        description: "Filter by message types (e.g. ['error', 'warning', 'log'])",
      },
      limit: { type: "number", description: "Max messages to return (default: 50)" },
    },
  },
};

export async function handleListConsoleMessages(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  await browserManager.ensureConnected();
  let messages = browserManager.getConsoleMessages(args.pageId as number | undefined);

  const types = args.types as string[] | undefined;
  if (types?.length) {
    messages = messages.filter((m) => types.includes(m.type));
  }

  const limit = (args.limit as number) ?? 50;
  messages = messages.slice(-limit);

  if (messages.length === 0) {
    return textResult("No console messages captured.");
  }

  const lines = messages.map(
    (m) =>
      `[${m.msgid}] ${m.type.toUpperCase()} ${m.text}${m.url ? ` (${m.url}:${m.lineNumber})` : ""}`,
  );
  return textResult(lines.join("\n"));
}

// --- get_console_message ---
export const getConsoleMessageTool = {
  name: "get_console_message",
  description: "Get a specific console message by ID",
  inputSchema: {
    type: "object" as const,
    properties: {
      msgid: { type: "number", description: "Message ID" },
      pageId: { type: "number", description: "Page ID (default: selected page)" },
    },
    required: ["msgid"],
  },
};

export async function handleGetConsoleMessage(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  await browserManager.ensureConnected();
  const messages = browserManager.getConsoleMessages(args.pageId as number | undefined);
  const msg = messages.find((m) => m.msgid === (args.msgid as number));

  if (!msg) {
    return textResult(`Console message ${args.msgid} not found.`);
  }

  return textResult(JSON.stringify(msg, null, 2));
}
