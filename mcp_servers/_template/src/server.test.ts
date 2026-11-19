import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./server.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((fn) => fn()));
});

async function connect() {
  const server = createServer();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanups.push(async () => {
    await client.close();
    await server.close();
  });
  return client;
}

describe("template server", () => {
  it("lists the hello tool with input and output schemas", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(["hello"]);
    expect(tools[0]?.inputSchema.required).toEqual(["name"]);
    expect(tools[0]?.outputSchema).toBeDefined();
  });

  it("calls hello and returns structuredContent", async () => {
    const client = await connect();
    const result = await client.callTool({ name: "hello", arguments: { name: "World" } });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      greeting: "Hello, World! Welcome to the MCP server.",
    });
  });

  it("rejects invalid input", async () => {
    const client = await connect();
    const outcome = await client
      .callTool({ name: "hello", arguments: {} })
      .then((r) => ({ isError: r.isError, text: JSON.stringify(r.content) }))
      .catch((e: Error) => ({ isError: true, text: e.message }));
    expect(outcome.isError).toBe(true);
    expect(outcome.text).toMatch(/name/i);
  });
});
