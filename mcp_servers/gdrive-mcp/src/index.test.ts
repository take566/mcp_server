import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { drive_v3 } from 'googleapis';
import { describe, expect, it, vi } from 'vitest';
import { createServer } from './index.js';

const setup = async (list: ReturnType<typeof vi.fn>) => {
  const drive = { files: { list } } as unknown as drive_v3.Drive;
  const server = createServer(drive);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
};

describe('gdrive-mcp', () => {
  it('lists the search tool with its input schema', async () => {
    const { client, server } = await setup(vi.fn());
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('search');
    expect(tools[0].inputSchema.type).toBe('object');
    expect(tools[0].inputSchema.properties).toEqual({
      query: { type: 'string', description: '検索クエリ' },
    });
    expect(tools[0].inputSchema.required).toEqual(['query']);
    await client.close();
    await server.close();
  });

  it('search calls drive.files.list and formats results', async () => {
    const list = vi.fn().mockResolvedValue({
      data: { files: [{ id: 'abc', name: 'doc', mimeType: 'text/plain' }] },
    });
    const { client, server } = await setup(list);
    const result = await client.callTool({ name: 'search', arguments: { query: "name contains 'doc'" } });
    expect(list).toHaveBeenCalledWith({
      q: "name contains 'doc'",
      fields: 'files(id, name, mimeType)',
      pageSize: 20,
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0].text)).toEqual([
      { id: 'abc', name: 'doc', mimeType: 'text/plain', uri: 'gdrive:///abc' },
    ]);
    expect(result.isError).toBeFalsy();
    await client.close();
    await server.close();
  });

  it('search returns isError when the Drive API fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, server } = await setup(vi.fn().mockRejectedValue(new Error('boom')));
    const result = await client.callTool({ name: 'search', arguments: { query: 'x' } });
    expect(result.isError).toBe(true);
    await client.close();
    await server.close();
  });
});
