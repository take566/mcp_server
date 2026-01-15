/**
 * Tool Search と Programmatic Tool Use の使用例
 * 
 * このファイルは、Anthropicのベータ機能を使用したMCPツールの実装例を示します。
 */

import { 
  createDeferredTool, 
  createProgrammaticTool, 
  createAdvancedTool,
  applyBetaFeaturesToTool,
  type MCPToolSchema 
} from '../tools/mcp-tool-utils';

// ============================================
// 例1: defer_loadingを使用したツール定義
// ============================================

/**
 * 通常のツール定義（セッション開始時にロードされる）
 */
const normalTool: MCPToolSchema = {
  name: "get_user_info",
  description: "Get current user information",
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User ID"
      }
    },
    required: ["userId"]
  }
};

/**
 * defer_loadingを使用したツール定義（必要時にのみロードされる）
 */
const deferredTool = createDeferredTool({
  name: "search_documents",
  description: "Search through documents (used infrequently)",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query"
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
        default: 10
      }
    },
    required: ["query"]
  }
});

// ============================================
// 例2: Programmatic Tool Useを使用したツール定義
// ============================================

/**
 * Programmatic Tool Useをサポートするツール
 * コード実行環境から呼び出し可能
 */
const programmaticTool = createProgrammaticTool({
  name: "batch_process_files",
  description: "Process multiple files in batch",
  inputSchema: {
    type: "object",
    properties: {
      filePaths: {
        type: "array",
        items: { type: "string" },
        description: "List of file paths to process"
      },
      operation: {
        type: "string",
        enum: ["read", "analyze", "transform"],
        description: "Operation to perform"
      }
    },
    required: ["filePaths", "operation"]
  }
}, ["code-execution"]); // code-execution環境からの呼び出しを許可

// ============================================
// 例3: 両方の機能を組み合わせたツール定義
// ============================================

/**
 * defer_loadingとProgrammatic Tool Useの両方をサポート
 */
const advancedTool = createAdvancedTool({
  name: "complex_data_analysis",
  description: "Perform complex data analysis using multiple tools",
  inputSchema: {
    type: "object",
    properties: {
      dataSource: {
        type: "string",
        description: "Data source identifier"
      },
      analysisType: {
        type: "string",
        enum: ["statistical", "machine_learning", "visualization"],
        description: "Type of analysis to perform"
      }
    },
    required: ["dataSource", "analysisType"]
  }
}, {
  deferLoading: true,
  allowedCallers: ["code-execution"]
});

// ============================================
// 例4: 設定ファイルからベータ機能を適用
// ============================================

/**
 * サーバー設定からベータ機能を適用する例
 */
function applyBetaFeaturesFromConfig() {
  // 設定ファイルから読み込まれた設定（例）
  const serverConfig = {
    betaFeatures: {
      toolSearch: true,
      programmaticToolUse: true
    },
    tools: {
      deferLoading: ["search_documents", "complex_data_analysis"]
    }
  };

  // 通常のツール定義
  const tool: MCPToolSchema = {
    name: "search_documents",
    description: "Search documents",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" }
      },
      required: ["query"]
    }
  };

  // ベータ機能を適用
  const enhancedTool = applyBetaFeaturesToTool(tool, {
    toolSearch: serverConfig.betaFeatures.toolSearch,
    programmaticToolUse: serverConfig.betaFeatures.programmaticToolUse,
    deferLoading: serverConfig.tools.deferLoading
  });

  console.log("Enhanced tool:", enhancedTool);
  // 出力:
  // {
  //   name: "search_documents",
  //   description: "Search documents",
  //   inputSchema: { ... },
  //   defer_loading: true,
  //   allowed_callers: ["code-execution"]
  // }
}

// ============================================
// 例5: MCPサーバーでの実装例
// ============================================

/**
 * MCPサーバーでツールを登録する際の例
 */
export function setupToolsWithBetaFeatures(server: any) {
  const tools = [
    // 通常のツール（常にロード）
    normalTool,
    
    // defer_loadingを使用したツール
    deferredTool,
    
    // Programmatic Tool Useをサポートするツール
    programmaticTool,
    
    // 両方の機能をサポートするツール
    advancedTool
  ];

  // ツールをサーバーに登録
  server.setRequestHandler("tools/list", async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        // ベータ機能のフラグを追加
        ...(tool.defer_loading !== undefined && { defer_loading: tool.defer_loading }),
        ...(tool.allowed_callers && { allowed_callers: tool.allowed_callers })
      }))
    };
  });
}

// ============================================
// 例6: コード実行環境での使用例
// ============================================

/**
 * Programmatic Tool Useを使用して複数のツールを効率的に実行
 */
export async function exampleProgrammaticUse() {
  // このコードはコード実行環境で実行され、
  // 複数のツール呼び出しが効率的に行われる
  
  // 複数のファイルを読み込む
  const file1 = await callTool("filesystem", "read_file", { path: "file1.txt" });
  const file2 = await callTool("filesystem", "read_file", { path: "file2.txt" });
  const file3 = await callTool("filesystem", "read_file", { path: "file3.txt" });
  
  // データを処理
  const processed = processFiles([file1, file2, file3]);
  
  // 結果を返す（最終結果のみがClaudeのコンテキストに入る）
  return processed;
}

function processFiles(files: any[]): any {
  // ファイル処理ロジック
  return files.map(file => ({
    name: file.name,
    size: file.content.length,
    processed: true
  }));
}

// 仮のツール呼び出し関数（実際の実装ではmcp-code-executionを使用）
async function callTool(server: string, tool: string, args: any): Promise<any> {
  // 実装は省略
  return {};
}

// ============================================
// エクスポート
// ============================================

export {
  normalTool,
  deferredTool,
  programmaticTool,
  advancedTool
};
