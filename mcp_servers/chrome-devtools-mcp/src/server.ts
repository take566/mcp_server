import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ToolHandler } from "./types.js";

// Navigation
import {
  navigatePageTool, handleNavigatePage,
  newPageTool, handleNewPage,
  closePageTool, handleClosePage,
  listPagesTool, handleListPages,
  selectPageTool, handleSelectPage,
} from "./tools/navigation.js";

// Interaction
import {
  clickTool, handleClick,
  fillTool, handleFill,
  fillFormTool, handleFillForm,
  hoverTool, handleHover,
  dragTool, handleDrag,
  typeTextTool, handleTypeText,
  pressKeyTool, handlePressKey,
  uploadFileTool, handleUploadFile,
} from "./tools/interaction.js";

// Inspection
import {
  takeScreenshotTool, handleTakeScreenshot,
  takeSnapshotTool, handleTakeSnapshot,
  takeMemorySnapshotTool, handleTakeMemorySnapshot,
} from "./tools/inspection.js";

// Scripting
import {
  evaluateScriptTool, handleEvaluateScript,
  handleDialogTool, handleHandleDialog,
} from "./tools/scripting.js";

// Console
import {
  listConsoleMessagesTool, handleListConsoleMessages,
  getConsoleMessageTool, handleGetConsoleMessage,
} from "./tools/console.js";

// Network
import {
  listNetworkRequestsTool, handleListNetworkRequests,
  getNetworkRequestTool, handleGetNetworkRequest,
} from "./tools/network.js";

// Emulation
import {
  emulateTool, handleEmulate,
  resizePageTool, handleResizePage,
  waitForTool, handleWaitFor,
} from "./tools/emulation.js";

// Performance
import {
  performanceStartTraceTool, handlePerformanceStartTrace,
  performanceStopTraceTool, handlePerformanceStopTrace,
  performanceAnalyzeInsightTool, handlePerformanceAnalyzeInsight,
  lighthouseAuditTool, handleLighthouseAudit,
} from "./tools/performance.js";

const allTools = [
  // Navigation
  navigatePageTool, newPageTool, closePageTool, listPagesTool, selectPageTool,
  // Interaction
  clickTool, fillTool, fillFormTool, hoverTool, dragTool, typeTextTool, pressKeyTool, uploadFileTool,
  // Inspection
  takeScreenshotTool, takeSnapshotTool, takeMemorySnapshotTool,
  // Scripting
  evaluateScriptTool, handleDialogTool,
  // Console
  listConsoleMessagesTool, getConsoleMessageTool,
  // Network
  listNetworkRequestsTool, getNetworkRequestTool,
  // Emulation
  emulateTool, resizePageTool, waitForTool,
  // Performance
  performanceStartTraceTool, performanceStopTraceTool, performanceAnalyzeInsightTool, lighthouseAuditTool,
];

const handlers: Record<string, ToolHandler> = {
  navigate_page: handleNavigatePage,
  new_page: handleNewPage,
  close_page: handleClosePage,
  list_pages: handleListPages,
  select_page: handleSelectPage,
  click: handleClick,
  fill: handleFill,
  fill_form: handleFillForm,
  hover: handleHover,
  drag: handleDrag,
  type_text: handleTypeText,
  press_key: handlePressKey,
  upload_file: handleUploadFile,
  take_screenshot: handleTakeScreenshot,
  take_snapshot: handleTakeSnapshot,
  take_memory_snapshot: handleTakeMemorySnapshot,
  evaluate_script: handleEvaluateScript,
  handle_dialog: handleHandleDialog,
  list_console_messages: handleListConsoleMessages,
  get_console_message: handleGetConsoleMessage,
  list_network_requests: handleListNetworkRequests,
  get_network_request: handleGetNetworkRequest,
  emulate: handleEmulate,
  resize_page: handleResizePage,
  wait_for: handleWaitFor,
  performance_start_trace: handlePerformanceStartTrace,
  performance_stop_trace: handlePerformanceStopTrace,
  performance_analyze_insight: handlePerformanceAnalyzeInsight,
  lighthouse_audit: handleLighthouseAudit,
};

export function createServer(): Server {
  const server = new Server(
    {
      name: "chrome-devtools-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = handlers[name];

    if (!handler) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      return await handler(args ?? {});
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  server.onerror = (error) => {
    console.error("[MCP Error]", error);
  };

  return server;
}
