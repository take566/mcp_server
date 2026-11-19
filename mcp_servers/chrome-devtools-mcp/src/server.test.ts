import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listPages: vi.fn(),
  getSelectedPage: vi.fn(),
  ensureConnected: vi.fn(),
}));

vi.mock("./browser-manager.js", () => ({
  browserManager: {
    listPages: mocks.listPages,
    getSelectedPage: mocks.getSelectedPage,
    ensureConnected: mocks.ensureConnected,
  },
}));

import { createServer } from "./server.js";

const EXPECTED_TOOLS = [
  "click", "close_page", "drag", "emulate", "evaluate_script", "fill", "fill_form",
  "get_console_message", "get_network_request", "handle_dialog", "hover", "lighthouse_audit",
  "list_console_messages", "list_network_requests", "list_pages", "navigate_page", "new_page",
  "performance_analyze_insight", "performance_start_trace", "performance_stop_trace",
  "press_key", "resize_page", "select_page", "take_memory_snapshot", "take_screenshot",
  "take_snapshot", "type_text", "upload_file", "wait_for",
];

async function connect(): Promise<Client> {
  const server = createServer();
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe("chrome-devtools-mcp server", () => {
  beforeEach(() => vi.resetAllMocks());

  it("lists all tools with stable schemas", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(EXPECTED_TOOLS);

    const byName = Object.fromEntries(tools.map((t) => [t.name, t.inputSchema]));
    expect(byName.navigate_page.required).toEqual(["url"]);
    expect(byName.fill_form.required).toEqual(["elements"]);
    expect(byName.drag.required).toEqual(["from_uid", "to_uid"]);
    expect(byName.list_pages.required ?? []).toEqual([]);
    expect(byName.emulate.required ?? []).toEqual([]);
  });

  it("calls a tool through the mocked browser layer", async () => {
    mocks.listPages.mockResolvedValue([{ pageId: 1, url: "https://example.com", title: "Ex", selected: true }]);
    const client = await connect();
    const res = await client.callTool({ name: "list_pages", arguments: {} });
    expect(res.isError).toBeFalsy();
    expect(JSON.stringify(res.content)).toContain("example.com");
  });

  it("returns a well-formed error result when the browser layer throws", async () => {
    mocks.listPages.mockRejectedValue(new Error("Cannot connect to Chrome"));
    const client = await connect();
    const res = await client.callTool({ name: "list_pages", arguments: {} });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain("Error: Cannot connect to Chrome");
  });

  it("rejects invalid arguments without crashing", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "click", arguments: {} });
    expect(res.isError).toBe(true);
  });
});
