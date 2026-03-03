/**
 * MCP Tool Utilities
 * 
 * このモジュールは、Tool SearchとProgrammatic Tool Useのベータ機能を
 * サポートするためのユーティリティ関数を提供します。
 */

/**
 * 標準的なMCPツールスキーマの型定義
 */
export interface MCPToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * defer_loadingをサポートするツールスキーマ
 */
export interface DeferredToolSchema extends MCPToolSchema {
  defer_loading?: boolean;
}

/**
 * Programmatic Tool Useをサポートするツールスキーマ
 */
export interface ProgrammaticToolSchema extends MCPToolSchema {
  allowed_callers?: string[];
}

/**
 * 両方の機能をサポートするツールスキーマ
 */
export interface AdvancedToolSchema extends MCPToolSchema {
  defer_loading?: boolean;
  allowed_callers?: string[];
}

/**
 * defer_loadingフラグを設定したツールを作成
 * 
 * @param tool - 基本ツールスキーマ
 * @returns defer_loadingが有効なツールスキーマ
 * 
 * @example
 * ```typescript
 * const deferredTool = createDeferredTool({
 *   name: "read_file",
 *   description: "Read a file from the filesystem",
 *   inputSchema: {
 *     type: "object",
 *     properties: {
 *       path: { type: "string", description: "File path" }
 *     },
 *     required: ["path"]
 *   }
 * });
 * ```
 */
export function createDeferredTool(tool: MCPToolSchema): DeferredToolSchema {
  return {
    ...tool,
    defer_loading: true,
  };
}

/**
 * Programmatic Tool Useをサポートするツールを作成
 * 
 * @param tool - 基本ツールスキーマ
 * @param allowedCallers - このツールを呼び出せる環境のリスト（デフォルト: ["code-execution"]）
 * @returns Programmatic Tool Useが有効なツールスキーマ
 * 
 * @example
 * ```typescript
 * const programmaticTool = createProgrammaticTool({
 *   name: "process_data",
 *   description: "Process data using multiple tools",
 *   inputSchema: {
 *     type: "object",
 *     properties: {
 *       data: { type: "string" }
 *     }
 *   }
 * }, ["code-execution", "agent"]);
 * ```
 */
export function createProgrammaticTool(
  tool: MCPToolSchema,
  allowedCallers: string[] = ["code-execution"]
): ProgrammaticToolSchema {
  return {
    ...tool,
    allowed_callers: allowedCallers,
  };
}

/**
 * 両方の機能をサポートするツールを作成
 * 
 * @param tool - 基本ツールスキーマ
 * @param options - オプション設定
 * @returns 両方の機能が有効なツールスキーマ
 * 
 * @example
 * ```typescript
 * const advancedTool = createAdvancedTool({
 *   name: "complex_operation",
 *   description: "A complex operation",
 *   inputSchema: { /* ... */ }
 * }, {
 *   deferLoading: true,
 *   allowedCallers: ["code-execution"]
 * });
 * ```
 */
export function createAdvancedTool(
  tool: MCPToolSchema,
  options: {
    deferLoading?: boolean;
    allowedCallers?: string[];
  } = {}
): AdvancedToolSchema {
  const result: AdvancedToolSchema = { ...tool };

  if (options.deferLoading !== false) {
    result.defer_loading = true;
  }

  if (options.allowedCallers) {
    result.allowed_callers = options.allowedCallers;
  } else if (options.deferLoading !== false) {
    // defer_loadingが有効な場合、デフォルトでcode-executionを許可
    result.allowed_callers = ["code-execution"];
  }

  return result;
}

/**
 * ツールスキーマがdefer_loadingをサポートしているかチェック
 */
export function isDeferredTool(tool: any): tool is DeferredToolSchema {
  return tool && typeof tool === 'object' && tool.defer_loading === true;
}

/**
 * ツールスキーマがProgrammatic Tool Useをサポートしているかチェック
 */
export function isProgrammaticTool(tool: any): tool is ProgrammaticToolSchema {
  return (
    tool &&
    typeof tool === 'object' &&
    Array.isArray(tool.allowed_callers) &&
    tool.allowed_callers.length > 0
  );
}

/**
 * ツールスキーマが両方の機能をサポートしているかチェック
 */
export function isAdvancedTool(tool: any): tool is AdvancedToolSchema {
  return isDeferredTool(tool) && isProgrammaticTool(tool);
}

/**
 * ツールリストをフィルタリングして、defer_loadingが設定されているツールのみを返す
 */
export function filterDeferredTools(tools: any[]): DeferredToolSchema[] {
  return tools.filter(isDeferredTool);
}

/**
 * ツールリストをフィルタリングして、Programmatic Tool Useが設定されているツールのみを返す
 */
export function filterProgrammaticTools(tools: any[]): ProgrammaticToolSchema[] {
  return tools.filter(isProgrammaticTool);
}

/**
 * MCPサーバーの設定からベータ機能の設定を抽出
 */
export interface BetaFeaturesConfig {
  toolSearch?: boolean;
  programmaticToolUse?: boolean;
  deferLoading?: string[]; // ツール名のリスト
}

export function extractBetaFeaturesConfig(serverConfig: any): BetaFeaturesConfig {
  const config: BetaFeaturesConfig = {};

  if (serverConfig.betaFeatures) {
    config.toolSearch = serverConfig.betaFeatures.toolSearch;
    config.programmaticToolUse = serverConfig.betaFeatures.programmaticToolUse;
  }
  // 環境変数で上書き（未設定時のみ）
  if (typeof process !== "undefined" && process.env?.ENABLE_TOOL_SEARCH === "true" && config.toolSearch === undefined) {
    config.toolSearch = true;
  }

  if (serverConfig.tools?.deferLoading) {
    config.deferLoading = serverConfig.tools.deferLoading;
  }

  return config;
}

/**
 * ツールスキーマにベータ機能の設定を適用
 */
export function applyBetaFeaturesToTool(
  tool: MCPToolSchema,
  config: BetaFeaturesConfig
): AdvancedToolSchema {
  const result: AdvancedToolSchema = { ...tool };

  if (config.deferLoading?.includes(tool.name)) {
    result.defer_loading = true;
  }

  if (config.programmaticToolUse) {
    result.allowed_callers = ["code-execution"];
  }

  return result;
}
