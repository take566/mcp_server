import { browserManager } from "../browser-manager.js";
import { resolveUid, takeSnapshot } from "../uid-resolver.js";
import { textResult, type ToolResult } from "../types.js";

async function maybeSnapshot(
  includeSnapshot: boolean,
): Promise<string> {
  if (!includeSnapshot) return "";
  const page = await browserManager.getSelectedPage();
  const snapshot = await takeSnapshot(page);
  return "\n\n--- Page Snapshot ---\n" + snapshot;
}

// --- click ---
export const clickTool = {
  name: "click",
  description: "Click an element identified by UID from the accessibility snapshot",
  inputSchema: {
    type: "object" as const,
    properties: {
      uid: { type: "string", description: "Element UID from snapshot" },
      dblClick: { type: "boolean", description: "Double-click instead of single click" },
      includeSnapshot: { type: "boolean", description: "Include page snapshot after action" },
    },
    required: ["uid"],
  },
};

export async function handleClick(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const element = await resolveUid(page, args.uid as string);

  if (args.dblClick) {
    await element.click({ count: 2 });
  } else {
    await element.click();
  }

  const extra = await maybeSnapshot(!!args.includeSnapshot);
  return textResult(`Clicked element ${args.uid}` + extra);
}

// --- fill ---
export const fillTool = {
  name: "fill",
  description: "Clear and fill a text input element with a value",
  inputSchema: {
    type: "object" as const,
    properties: {
      uid: { type: "string", description: "Element UID from snapshot" },
      value: { type: "string", description: "Value to fill" },
      includeSnapshot: { type: "boolean", description: "Include page snapshot after action" },
    },
    required: ["uid", "value"],
  },
};

export async function handleFill(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const element = await resolveUid(page, args.uid as string);

  // Clear existing value
  await element.click({ count: 3 });
  await page.keyboard.press("Backspace");
  await element.type(args.value as string);

  const extra = await maybeSnapshot(!!args.includeSnapshot);
  return textResult(`Filled element ${args.uid} with "${args.value}"` + extra);
}

// --- fill_form ---
export const fillFormTool = {
  name: "fill_form",
  description: "Fill multiple form fields at once",
  inputSchema: {
    type: "object" as const,
    properties: {
      elements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            uid: { type: "string" },
            value: { type: "string" },
          },
          required: ["uid", "value"],
        },
        description: "Array of {uid, value} pairs",
      },
      includeSnapshot: { type: "boolean" },
    },
    required: ["elements"],
  },
};

export async function handleFillForm(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const elements = args.elements as Array<{ uid: string; value: string }>;

  for (const { uid, value } of elements) {
    const element = await resolveUid(page, uid);
    await element.click({ count: 3 });
    await page.keyboard.press("Backspace");
    await element.type(value);
  }

  const extra = await maybeSnapshot(!!args.includeSnapshot);
  return textResult(`Filled ${elements.length} form fields` + extra);
}

// --- hover ---
export const hoverTool = {
  name: "hover",
  description: "Hover over an element",
  inputSchema: {
    type: "object" as const,
    properties: {
      uid: { type: "string", description: "Element UID from snapshot" },
      includeSnapshot: { type: "boolean" },
    },
    required: ["uid"],
  },
};

export async function handleHover(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const element = await resolveUid(page, args.uid as string);
  await element.hover();

  const extra = await maybeSnapshot(!!args.includeSnapshot);
  return textResult(`Hovered over element ${args.uid}` + extra);
}

// --- drag ---
export const dragTool = {
  name: "drag",
  description: "Drag from one element to another",
  inputSchema: {
    type: "object" as const,
    properties: {
      from_uid: { type: "string", description: "Source element UID" },
      to_uid: { type: "string", description: "Target element UID" },
      includeSnapshot: { type: "boolean" },
    },
    required: ["from_uid", "to_uid"],
  },
};

export async function handleDrag(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const fromEl = await resolveUid(page, args.from_uid as string);
  const toEl = await resolveUid(page, args.to_uid as string);

  const fromBox = await fromEl.boundingBox();
  const toBox = await toEl.boundingBox();
  if (!fromBox || !toBox) throw new Error("Cannot get element positions for drag.");

  const fromCenter = { x: fromBox.x + fromBox.width / 2, y: fromBox.y + fromBox.height / 2 };
  const toCenter = { x: toBox.x + toBox.width / 2, y: toBox.y + toBox.height / 2 };

  await page.mouse.move(fromCenter.x, fromCenter.y);
  await page.mouse.down();
  await page.mouse.move(toCenter.x, toCenter.y, { steps: 10 });
  await page.mouse.up();

  const extra = await maybeSnapshot(!!args.includeSnapshot);
  return textResult(`Dragged from ${args.from_uid} to ${args.to_uid}` + extra);
}

// --- type_text ---
export const typeTextTool = {
  name: "type_text",
  description: "Type text using keyboard (types into the currently focused element)",
  inputSchema: {
    type: "object" as const,
    properties: {
      text: { type: "string", description: "Text to type" },
      submit: { type: "boolean", description: "Press Enter after typing" },
    },
    required: ["text"],
  },
};

export async function handleTypeText(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  await page.keyboard.type(args.text as string);
  if (args.submit) {
    await page.keyboard.press("Enter");
  }
  return textResult(`Typed "${args.text}"${args.submit ? " and submitted" : ""}`);
}

// --- press_key ---
export const pressKeyTool = {
  name: "press_key",
  description: "Press a keyboard key (e.g. Enter, Tab, Escape, ArrowDown)",
  inputSchema: {
    type: "object" as const,
    properties: {
      key: { type: "string", description: "Key name (e.g. Enter, Tab, Escape)" },
      modifiers: {
        type: "array",
        items: { type: "string" },
        description: "Modifier keys (e.g. ['Shift', 'Control'])",
      },
    },
    required: ["key"],
  },
};

export async function handlePressKey(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const modifiers = (args.modifiers as string[] | undefined) ?? [];

  for (const mod of modifiers) {
    await page.keyboard.down(mod as any);
  }
  await page.keyboard.press(args.key as any);
  for (const mod of modifiers.reverse()) {
    await page.keyboard.up(mod as any);
  }

  return textResult(`Pressed ${modifiers.length ? modifiers.join("+") + "+" : ""}${args.key}`);
}

// --- upload_file ---
export const uploadFileTool = {
  name: "upload_file",
  description: "Upload files to a file input element",
  inputSchema: {
    type: "object" as const,
    properties: {
      uid: { type: "string", description: "File input element UID" },
      filePaths: {
        type: "array",
        items: { type: "string" },
        description: "Absolute paths to files to upload",
      },
    },
    required: ["uid", "filePaths"],
  },
};

export async function handleUploadFile(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const element = await resolveUid(page, args.uid as string);
  const filePaths = args.filePaths as string[];
  const inputEl = element as unknown as import("puppeteer-core").ElementHandle<HTMLInputElement>;
  await inputEl.uploadFile(...filePaths);
  return textResult(`Uploaded ${filePaths.length} file(s) to element ${args.uid}`);
}
