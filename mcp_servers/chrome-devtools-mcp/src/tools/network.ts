import { browserManager } from "../browser-manager.js";
import { textResult, type ToolResult } from "../types.js";

// --- list_network_requests ---
export const listNetworkRequestsTool = {
  name: "list_network_requests",
  description: "List network requests captured from the browser page",
  inputSchema: {
    type: "object" as const,
    properties: {
      pageId: { type: "number", description: "Page ID (default: selected page)" },
      resourceTypes: {
        type: "array",
        items: { type: "string" },
        description: "Filter by resource types (e.g. ['document', 'xhr', 'fetch', 'script'])",
      },
      limit: { type: "number", description: "Max requests to return (default: 50)" },
    },
  },
};

export async function handleListNetworkRequests(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  await browserManager.ensureConnected();
  let requests = browserManager.getNetworkRequests(args.pageId as number | undefined);

  const resourceTypes = args.resourceTypes as string[] | undefined;
  if (resourceTypes?.length) {
    requests = requests.filter((r) => resourceTypes.includes(r.resourceType));
  }

  const limit = (args.limit as number) ?? 50;
  requests = requests.slice(-limit);

  if (requests.length === 0) {
    return textResult("No network requests captured.");
  }

  const lines = requests.map(
    (r) =>
      `[${r.reqid}] ${r.method} ${r.status ?? "..."} ${r.url.slice(0, 120)}${r.url.length > 120 ? "..." : ""}`,
  );
  return textResult(lines.join("\n"));
}

// --- get_network_request ---
export const getNetworkRequestTool = {
  name: "get_network_request",
  description: "Get full details of a specific network request by ID",
  inputSchema: {
    type: "object" as const,
    properties: {
      reqid: { type: "number", description: "Request ID" },
      pageId: { type: "number", description: "Page ID (default: selected page)" },
    },
    required: ["reqid"],
  },
};

export async function handleGetNetworkRequest(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  await browserManager.ensureConnected();
  const requests = browserManager.getNetworkRequests(args.pageId as number | undefined);
  const req = requests.find((r) => r.reqid === (args.reqid as number));

  if (!req) {
    return textResult(`Network request ${args.reqid} not found.`);
  }

  return textResult(JSON.stringify(req, null, 2));
}
