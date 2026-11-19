import { z } from "zod";
import { browserManager } from "../browser-manager.js";
import { defineTool, textResult } from "../types.js";

export const listNetworkRequestsTool = defineTool({
  name: "list_network_requests",
  description: "List network requests captured from the browser page",
  inputSchema: {
    pageId: z.number().optional().describe("Page ID (default: selected page)"),
    resourceTypes: z
      .array(z.string())
      .optional()
      .describe("Filter by resource types (e.g. ['document', 'xhr', 'fetch', 'script'])"),
    limit: z.number().optional().describe("Max requests to return (default: 50)"),
  },
  handler: async ({ pageId, resourceTypes, limit }) => {
    await browserManager.ensureConnected();
    let requests = browserManager.getNetworkRequests(pageId);

    if (resourceTypes?.length) {
      requests = requests.filter((r) => resourceTypes.includes(r.resourceType));
    }

    requests = requests.slice(-(limit ?? 50));

    if (requests.length === 0) {
      return textResult("No network requests captured.");
    }

    const lines = requests.map(
      (r) =>
        `[${r.reqid}] ${r.method} ${r.status ?? "..."} ${r.url.slice(0, 120)}${r.url.length > 120 ? "..." : ""}`,
    );
    return textResult(lines.join("\n"));
  },
});

export const getNetworkRequestTool = defineTool({
  name: "get_network_request",
  description: "Get full details of a specific network request by ID",
  inputSchema: {
    reqid: z.number().describe("Request ID"),
    pageId: z.number().optional().describe("Page ID (default: selected page)"),
  },
  handler: async ({ reqid, pageId }) => {
    await browserManager.ensureConnected();
    const requests = browserManager.getNetworkRequests(pageId);
    const req = requests.find((r) => r.reqid === reqid);

    if (!req) {
      return textResult(`Network request ${reqid} not found.`);
    }

    return textResult(JSON.stringify(req, null, 2));
  },
});

export const networkTools = [listNetworkRequestsTool, getNetworkRequestTool];
