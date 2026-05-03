import { browserManager } from "../browser-manager.js";
import { textResult, type ToolResult } from "../types.js";
import type { Dialog } from "puppeteer-core";

let pendingDialog: Dialog | null = null;
let dialogListenerAttached = false;

function ensureDialogListener(page: import("puppeteer-core").Page): void {
  if (dialogListenerAttached) return;
  page.on("dialog", (dialog: Dialog) => {
    pendingDialog = dialog;
    console.error(`[chrome-devtools] Dialog appeared: ${dialog.type()} - "${dialog.message()}"`);
  });
  dialogListenerAttached = true;
}

// --- evaluate_script ---
export const evaluateScriptTool = {
  name: "evaluate_script",
  description: "Execute JavaScript in the browser page context and return the result",
  inputSchema: {
    type: "object" as const,
    properties: {
      expression: { type: "string", description: "JavaScript expression or function body to evaluate" },
    },
    required: ["expression"],
  },
};

export async function handleEvaluateScript(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  ensureDialogListener(page);

  try {
    const result = await page.evaluate(args.expression as string);
    const output =
      result === undefined ? "undefined" : JSON.stringify(result, null, 2);
    return textResult(output);
  } catch (error) {
    return textResult(
      `Evaluation error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// --- handle_dialog ---
export const handleDialogTool = {
  name: "handle_dialog",
  description: "Accept or dismiss a browser dialog (alert, confirm, prompt, beforeunload)",
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        enum: ["accept", "dismiss"],
        description: "Whether to accept or dismiss the dialog",
      },
      promptText: {
        type: "string",
        description: "Text to enter for prompt dialogs",
      },
    },
    required: ["action"],
  },
};

export async function handleHandleDialog(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  if (!pendingDialog) {
    return textResult("No pending dialog to handle.");
  }

  const dialog = pendingDialog;
  pendingDialog = null;

  const action = args.action as "accept" | "dismiss";
  if (action === "accept") {
    await dialog.accept(args.promptText as string | undefined);
  } else {
    await dialog.dismiss();
  }

  return textResult(
    `Dialog "${dialog.type()}" ${action}ed. Message was: "${dialog.message()}"`,
  );
}
