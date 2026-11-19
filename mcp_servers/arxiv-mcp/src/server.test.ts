import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./arxiv-client.js", () => ({
  searchPapers: vi.fn(async () => ({
    totalResults: 1,
    startIndex: 0,
    itemsPerPage: 10,
    papers: [
      {
        id: "1706.03762",
        title: "Attention Is All You Need",
        authors: ["Vaswani"],
        abstract: "Transformers.",
        categories: ["cs.CL"],
        primaryCategory: "cs.CL",
        published: "2017-06-12T00:00:00Z",
        updated: "2017-06-12T00:00:00Z",
        pdfUrl: "https://arxiv.org/pdf/1706.03762",
        abstractUrl: "https://arxiv.org/abs/1706.03762",
      },
    ],
  })),
  getPaperById: vi.fn(async () => []),
}));

import { searchPapers } from "./arxiv-client.js";
import { createServer } from "./server.js";

async function connect() {
  const server = createServer();
  const client = new Client({ name: "test", version: "0.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  return { client, server };
}

function textOf(res: unknown): string {
  return (res as { content: Array<{ text: string }> }).content[0].text;
}

describe("arxiv-mcp server", () => {
  let closers: Array<() => Promise<void>> = [];
  afterEach(async () => {
    await Promise.all(closers.map((c) => c()));
    closers = [];
  });

  async function setup() {
    const { client, server } = await connect();
    closers.push(
      () => client.close(),
      () => server.close(),
    );
    return client;
  }

  it("lists the four tools with expected schemas", async () => {
    const client = await setup();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "get_paper",
      "get_paper_pdf_url",
      "list_categories",
      "search_papers",
    ]);
    const search = tools.find((t) => t.name === "search_papers");
    expect(search?.inputSchema.required).toEqual(["query"]);
    expect(Object.keys(search?.inputSchema.properties ?? {}).sort()).toEqual([
      "categories",
      "maxResults",
      "query",
      "sortBy",
      "sortOrder",
      "start",
    ]);
    expect(tools.find((t) => t.name === "get_paper")?.inputSchema.required).toEqual(["ids"]);
    expect(tools.find((t) => t.name === "get_paper_pdf_url")?.inputSchema.required).toEqual(["id"]);
  });

  it("calls search_papers with the arXiv client mocked", async () => {
    const client = await setup();
    const res = await client.callTool({
      name: "search_papers",
      arguments: { query: "all:transformer" },
    });
    expect(searchPapers).toHaveBeenCalledWith(
      expect.objectContaining({ query: "all:transformer", maxResults: 10, start: 0 }),
    );
    expect(textOf(res)).toContain("Attention Is All You Need");
  });

  it("calls list_categories without network", async () => {
    const client = await setup();
    const res = await client.callTool({
      name: "list_categories",
      arguments: { group: "Statistics" },
    });
    expect(textOf(res)).toContain("stat.ML");
  });
});
