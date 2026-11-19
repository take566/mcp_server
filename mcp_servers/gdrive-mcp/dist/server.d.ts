import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type drive_v3 } from 'googleapis';
export declare const authenticate: () => Promise<void>;
export declare const createDriveClient: () => drive_v3.Drive;
export declare const createServer: (drive: drive_v3.Drive) => McpServer;
