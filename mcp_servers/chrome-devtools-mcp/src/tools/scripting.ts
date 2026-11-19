import type { Dialog, Page } from "puppeteer-core";
import { z } from "zod";
import { browserManager } from "../browser-manager.js";
import { defineTool, textResult } from "../types.js";

let pendingDialog: Dialog | null = null;
let dialogListenerAttached = false;

function ensureDialogListener(page: Page): void {
  if (dialogListenerAttached) return;
  page.on("dialog", (dialog: Dialog) => {
    pendingDialog = dialog;
    console.error(`[chrome-devtools] Dialog appeared: ${dialog.type()} - "${dialog.message()}"`);
  });
  dialogListenerAttached = true;
}

export const evaluateScriptTool = defineTool({
  name: "evaluate_script",
  description: "Execute JavaScript in the browser page context and return the result",
  inputSchema: {
    expression: z.string().describe("JavaScript expression or function body to evaluate"),
  },
  handler: async ({ expression }) => {
    const page = await browserManager.getSelectedPage();
    ensureDialogListener(page);

    try {
      const result = await page.evaluate(expression);
      const output = result === undefined ? "undefined" : JSON.stringify(result, null, 2);
      return textResult(output);
    } catch (error) {
      return textResult(
        `Evaluation error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});

export const handleDialogTool = defineTool({
  name: "handle_dialog",
  description: "Accept or dismiss a browser dialog (alert, confirm, prompt, beforeunload)",
  inputSchema: {
    action: z.enum(["accept", "dismiss"]).describe("Whether to accept or dismiss the dialog"),
    promptText: z.string().optional().describe("Text to enter for prompt dialogs"),
  },
  handler: async ({ action, promptText }) => {
    if (!pendingDialog) {
      return textResult("No pending dialog to handle.");
    }

    const dialog = pendingDialog;
    pendingDialog = null;

    if (action === "accept") {
      await dialog.accept(promptText);
    } else {
      await dialog.dismiss();
    }

    return textResult(`Dialog "${dialog.type()}" ${action}ed. Message was: "${dialog.message()}"`);
  },
});

export const scriptingTools = [evaluateScriptTool, handleDialogTool];
