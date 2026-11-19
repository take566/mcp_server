import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { drive_v3 } from 'googleapis';
import { describe, expect, it, vi } from 'vitest';
import { createServer } from './server.js';

const setup = async (list: ReturnType<typeof vi.fn>, files: Record<string, unknown> = {}) => {
  const drive = { files: { list, ...files } } as unknown as drive_v3.Drive;
  const server = createServer(drive);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
};

const bytes = (text: string) => new TextEncoder().encode(text).buffer;

describe('gdrive-mcp', () => {
  it('lists the search tool with its input schema', async () => {
    const { client, server } = await setup(vi.fn());
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('search');
    expect(tools[0].inputSchema.type).toBe('object');
    expect(tools[0].inputSchema.properties).toEqual({
      query: { type: 'string', minLength: 1, description: '検索クエリ' },
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

  it('rejects an empty search query without calling Drive', async () => {
    const list = vi.fn();
    const { client, server } = await setup(list);
    const outcome = await client
      .callTool({ name: 'search', arguments: { query: '' } })
      .then((r) => ({ failed: r.isError === true }))
      .catch(() => ({ failed: true }));
    expect(outcome.failed).toBe(true);
    expect(list).not.toHaveBeenCalled();
    await client.close();
    await server.close();
  });

  it('lists no resources', async () => {
    const { client, server } = await setup(vi.fn());
    expect((await client.listResources()).resources).toEqual([]);
    await client.close();
    await server.close();
  });

  it('reads a regular text file as text', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { mimeType: 'text/plain' } })
      .mockResolvedValueOnce({ data: bytes('hello') });
    const { client, server } = await setup(vi.fn(), { get });
    const res = await client.readResource({ uri: 'gdrive:///f1' });
    expect(res.contents[0]).toMatchObject({ uri: 'gdrive:///f1', mimeType: 'text/plain', text: 'hello' });
    expect(get).toHaveBeenLastCalledWith({ fileId: 'f1', alt: 'media' }, { responseType: 'arraybuffer' });
    await client.close();
    await server.close();
  });

  it('exports a Google Doc as markdown', async () => {
    const get = vi.fn().mockResolvedValue({ data: { mimeType: 'application/vnd.google-apps.document' } });
    const exportFile = vi.fn().mockResolvedValue({ data: bytes('# hi') });
    const { client, server } = await setup(vi.fn(), { get, export: exportFile });
    const res = await client.readResource({ uri: 'gdrive:///doc1' });
    expect(exportFile).toHaveBeenCalledWith(
      { fileId: 'doc1', mimeType: 'text/markdown' },
      { responseType: 'arraybuffer' }
    );
    expect(res.contents[0]).toMatchObject({ mimeType: 'text/markdown', text: '# hi' });
    await client.close();
    await server.close();
  });

  it('rejects an invalid resource URI', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, server } = await setup(vi.fn());
    await expect(client.readResource({ uri: 'http://example.com/x' })).rejects.toThrow();
    await client.close();
    await server.close();
  });
});
