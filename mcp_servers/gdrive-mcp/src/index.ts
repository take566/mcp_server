#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { authenticate, createDriveClient, createServer } from './server.js';

const run = async () => {
  const mcpServer = createServer(createDriveClient());

  // エラーハンドリング
  mcpServer.server.onerror = (error) => console.error('[MCP Error]', error);
  process.on('SIGINT', async () => {
    await mcpServer.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await mcpServer.close();
    process.exit(0);
  });

  await mcpServer.connect(new StdioServerTransport());
  console.error('Google Drive MCPサーバーがstdioで実行中');
};

// メイン処理
if (process.argv.includes('auth')) {
  authenticate().catch(console.error);
} else {
  run().catch(console.error);
}
