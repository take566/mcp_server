import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer } from "./server.js";

async function connect() {
  const server = createServer();
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

const textOf = (res: { content?: unknown }) =>
  (res.content as Array<{ text: string }>).map((c) => c.text);

describe("openrouter-mcp", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("lists both tools with unchanged schemas", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    expect(Object.keys(byName).sort()).toEqual([
      "openrouter_chat",
      "openrouter_list_models",
    ]);
    const chat = byName.openrouter_chat.inputSchema;
    expect(chat.required).toEqual(["model", "messages"]);
    const props = chat.properties as Record<string, { type: string }>;
    expect(props.max_tokens.type).toBe("number");
    expect(props.messages.type).toBe("array");
    expect(byName.openrouter_list_models.inputSchema.required ?? []).toEqual(
      [],
    );
  });

  it("calls openrouter_list_models with mocked fetch", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              { id: "openai/gpt-4o-mini", context_length: 128000 },
              { id: "anthropic/claude", pricing: { prompt: "1" } },
            ],
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = await connect();
    const res = await client.callTool({
      name: "openrouter_list_models",
      arguments: { query: "openai" },
    });
    expect(res.isError).toBeFalsy();
    const [text] = textOf(res);
    expect(text).toContain("Found 1 model(s)");
    expect(text).toContain("openai/gpt-4o-mini ctx=128000");
  });

  it("calls openrouter_chat with mocked fetch", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "1",
            model: "m",
            choices: [{ message: { role: "assistant", content: "hi" } }],
            usage: { total_tokens: 3 },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = await connect();
    const res = await client.callTool({
      name: "openrouter_chat",
      arguments: { model: "m", messages: [{ role: "user", content: "yo" }] },
    });
    const [first, second] = textOf(res);
    expect(first).toBe("hi");
    expect(second).toContain("total_tokens");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects out-of-range arguments without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const client = await connect();
    const res = await client
      .callTool({
        name: "openrouter_chat",
        arguments: {
          model: "m",
          messages: [{ role: "user", content: "yo" }],
          temperature: 5,
        },
      })
      .catch((e: unknown) => ({ isError: true, e }));
    expect(res.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an MCP error result when the API key is missing", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const client = await connect();
    const res = await client.callTool({
      name: "openrouter_list_models",
      arguments: {},
    });
    expect(res.isError).toBe(true);
  });
});
