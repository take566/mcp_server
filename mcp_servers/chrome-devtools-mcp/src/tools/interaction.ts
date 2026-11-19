import type { ElementHandle } from "puppeteer-core";
import { z } from "zod";
import { browserManager } from "../browser-manager.js";
import { resolveUid, takeSnapshot } from "../uid-resolver.js";
import { defineTool, textResult } from "../types.js";

async function maybeSnapshot(includeSnapshot: boolean | undefined): Promise<string> {
  if (!includeSnapshot) return "";
  const page = await browserManager.getSelectedPage();
  const snapshot = await takeSnapshot(page);
  return `\n\n--- Page Snapshot ---\n${snapshot}`;
}

async function clearAndType(
  page: Awaited<ReturnType<typeof browserManager.getSelectedPage>>,
  element: ElementHandle,
  value: string,
): Promise<void> {
  await element.click({ count: 3 });
  await page.keyboard.press("Backspace");
  await element.type(value);
}

export const clickTool = defineTool({
  name: "click",
  description: "Click an element identified by UID from the accessibility snapshot",
  inputSchema: {
    uid: z.string().describe("Element UID from snapshot"),
    dblClick: z.boolean().optional().describe("Double-click instead of single click"),
    includeSnapshot: z.boolean().optional().describe("Include page snapshot after action"),
  },
  handler: async ({ uid, dblClick, includeSnapshot }) => {
    const page = await browserManager.getSelectedPage();
    const element = await resolveUid(page, uid);

    if (dblClick) {
      await element.click({ count: 2 });
    } else {
      await element.click();
    }

    return textResult(`Clicked element ${uid}${await maybeSnapshot(includeSnapshot)}`);
  },
});

export const fillTool = defineTool({
  name: "fill",
  description: "Clear and fill a text input element with a value",
  inputSchema: {
    uid: z.string().describe("Element UID from snapshot"),
    value: z.string().describe("Value to fill"),
    includeSnapshot: z.boolean().optional().describe("Include page snapshot after action"),
  },
  handler: async ({ uid, value, includeSnapshot }) => {
    const page = await browserManager.getSelectedPage();
    const element = await resolveUid(page, uid);
    await clearAndType(page, element, value);
    return textResult(`Filled element ${uid} with "${value}"${await maybeSnapshot(includeSnapshot)}`);
  },
});

export const fillFormTool = defineTool({
  name: "fill_form",
  description: "Fill multiple form fields at once",
  inputSchema: {
    elements: z
      .array(z.object({ uid: z.string(), value: z.string() }))
      .describe("Array of {uid, value} pairs"),
    includeSnapshot: z.boolean().optional(),
  },
  handler: async ({ elements, includeSnapshot }) => {
    const page = await browserManager.getSelectedPage();

    for (const { uid, value } of elements) {
      const element = await resolveUid(page, uid);
      await clearAndType(page, element, value);
    }

    return textResult(`Filled ${elements.length} form fields${await maybeSnapshot(includeSnapshot)}`);
  },
});

export const hoverTool = defineTool({
  name: "hover",
  description: "Hover over an element",
  inputSchema: {
    uid: z.string().describe("Element UID from snapshot"),
    includeSnapshot: z.boolean().optional(),
  },
  handler: async ({ uid, includeSnapshot }) => {
    const page = await browserManager.getSelectedPage();
    const element = await resolveUid(page, uid);
    await element.hover();
    return textResult(`Hovered over element ${uid}${await maybeSnapshot(includeSnapshot)}`);
  },
});

export const dragTool = defineTool({
  name: "drag",
  description: "Drag from one element to another",
  inputSchema: {
    from_uid: z.string().describe("Source element UID"),
    to_uid: z.string().describe("Target element UID"),
    includeSnapshot: z.boolean().optional(),
  },
  handler: async ({ from_uid, to_uid, includeSnapshot }) => {
    const page = await browserManager.getSelectedPage();
    const fromEl = await resolveUid(page, from_uid);
    const toEl = await resolveUid(page, to_uid);

    const fromBox = await fromEl.boundingBox();
    const toBox = await toEl.boundingBox();
    if (!fromBox || !toBox) throw new Error("Cannot get element positions for drag.");

    const fromCenter = { x: fromBox.x + fromBox.width / 2, y: fromBox.y + fromBox.height / 2 };
    const toCenter = { x: toBox.x + toBox.width / 2, y: toBox.y + toBox.height / 2 };

    await page.mouse.move(fromCenter.x, fromCenter.y);
    await page.mouse.down();
    await page.mouse.move(toCenter.x, toCenter.y, { steps: 10 });
    await page.mouse.up();

    return textResult(`Dragged from ${from_uid} to ${to_uid}${await maybeSnapshot(includeSnapshot)}`);
  },
});

export const typeTextTool = defineTool({
  name: "type_text",
  description: "Type text using keyboard (types into the currently focused element)",
  inputSchema: {
    text: z.string().describe("Text to type"),
    submit: z.boolean().optional().describe("Press Enter after typing"),
  },
  handler: async ({ text, submit }) => {
    const page = await browserManager.getSelectedPage();
    await page.keyboard.type(text);
    if (submit) {
      await page.keyboard.press("Enter");
    }
    return textResult(`Typed "${text}"${submit ? " and submitted" : ""}`);
  },
});

type KeyInput = Parameters<
  Awaited<ReturnType<typeof browserManager.getSelectedPage>>["keyboard"]["press"]
>[0];

export const pressKeyTool = defineTool({
  name: "press_key",
  description: "Press a keyboard key (e.g. Enter, Tab, Escape, ArrowDown)",
  inputSchema: {
    key: z.string().describe("Key name (e.g. Enter, Tab, Escape)"),
    modifiers: z
      .array(z.string())
      .optional()
      .describe("Modifier keys (e.g. ['Shift', 'Control'])"),
  },
  handler: async ({ key, modifiers }) => {
    const page = await browserManager.getSelectedPage();
    const mods = modifiers ?? [];

    const held: string[] = [];
    try {
      for (const mod of mods) {
        await page.keyboard.down(mod as KeyInput);
        held.push(mod);
      }
      await page.keyboard.press(key as KeyInput);
    } finally {
      for (const mod of held.reverse()) {
        await page.keyboard.up(mod as KeyInput);
      }
    }

    return textResult(`Pressed ${mods.length ? `${mods.join("+")}+` : ""}${key}`);
  },
});

export const uploadFileTool = defineTool({
  name: "upload_file",
  description: "Upload files to a file input element",
  inputSchema: {
    uid: z.string().describe("File input element UID"),
    filePaths: z.array(z.string()).describe("Absolute paths to files to upload"),
  },
  handler: async ({ uid, filePaths }) => {
    const page = await browserManager.getSelectedPage();
    const element = await resolveUid(page, uid);
    const inputEl = element as unknown as ElementHandle<HTMLInputElement>;
    await inputEl.uploadFile(...filePaths);
    return textResult(`Uploaded ${filePaths.length} file(s) to element ${uid}`);
  },
});

export const interactionTools = [
  clickTool,
  fillTool,
  fillFormTool,
  hoverTool,
  dragTool,
  typeTextTool,
  pressKeyTool,
  uploadFileTool,
];
