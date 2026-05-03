/**
 * Structured errors for MCP client operations (connect, listTools, callTool).
 */

export type MCPClientErrorCode =
  | 'CONNECTION_FAILED'
  | 'TOOL_CALL_FAILED'
  | 'LIST_TOOLS_FAILED'
  | 'SERVER_NOT_FOUND'
  | 'MCP_TOOL_ERROR';

export class MCPClientError extends Error {
  readonly code: MCPClientErrorCode;
  readonly cause?: unknown;

  constructor(
    message: string,
    code: MCPClientErrorCode,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.name = 'MCPClientError';
    this.code = code;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
