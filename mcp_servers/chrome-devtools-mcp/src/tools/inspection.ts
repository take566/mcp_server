import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { browserManager } from "../browser-manager.js";
import { resolveUid, takeSnapshot } from "../uid-resolver.js";
import { defineTool, imageResult, textResult } from "../types.js";

export const takeScreenshotTool = defineTool({
  name: "take_screenshot",
  description: "Take a screenshot of the current page or a specific element",
  inputSchema: {
    uid: z.string().optional().describe("Element UID to screenshot (omit for full page)"),
    fullPage: z.boolean().optional().describe("Capture full scrollable page"),
    format: z.enum(["png", "jpeg", "webp"]).optional().describe("Image format (default: png)"),
    quality: z.number().optional().describe("Quality for jpeg/webp (0-100)"),
    filePath: z.string().optional().describe("Save screenshot to file path"),
  },
  handler: async ({ uid, fullPage, format: fmt, quality, filePath }) => {
    const page = await browserManager.getSelectedPage();
    const format = fmt ?? "png";

    const options: Record<string, unknown> = {
      type: format,
      fullPage: !!fullPage,
      encoding: "base64" as const,
    };

    if (quality != null && format !== "png") {
      options.quality = quality;
    }

    let base64: string;

    if (uid) {
      const element = await resolveUid(page, uid);
      base64 = (await element.screenshot(options)) as unknown as string;
    } else {
      base64 = (await page.screenshot(options)) as unknown as string;
    }

    if (filePath) {
      await writeFile(filePath, Buffer.from(base64, "base64"));
      return textResult(`Screenshot saved to ${filePath}`);
    }

    const mimeType =
      format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    return imageResult(base64, mimeType);
  },
});

export const takeSnapshotTool = defineTool({
  name: "take_snapshot",
  description:
    "Take an accessibility tree snapshot of the current page. Returns a tree of elements with UIDs that can be used with interaction tools.",
  inputSchema: {
    verbose: z.boolean().optional().describe("Include additional details like descriptions"),
    filePath: z.string().optional().describe("Save snapshot to file path"),
  },
  handler: async ({ verbose, filePath }) => {
    const page = await browserManager.getSelectedPage();
    const snapshot = await takeSnapshot(page, !!verbose);

    if (filePath) {
      await writeFile(filePath, snapshot, "utf-8");
      return textResult(`Snapshot saved to ${filePath}`);
    }

    return textResult(snapshot);
  },
});

export const takeMemorySnapshotTool = defineTool({
  name: "take_memory_snapshot",
  description: "Take a heap memory snapshot (V8 heap profile) and save to file",
  inputSchema: {
    filePath: z.string().describe("File path to save the heap snapshot (.heapsnapshot)"),
  },
  handler: async ({ filePath }) => {
    const page = await browserManager.getSelectedPage();
    const client = await page.createCDPSession();

    try {
      const chunks: string[] = [];
      client.on("HeapProfiler.addHeapSnapshotChunk", (params: { chunk: string }) => {
        chunks.push(params.chunk);
      });

      await client.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
      const snapshot = chunks.join("");

      await writeFile(filePath, snapshot, "utf-8");
      return textResult(
        `Heap snapshot saved to ${filePath} (${(snapshot.length / 1024 / 1024).toFixed(1)}MB)`,
      );
    } finally {
      await client.detach();
    }
  },
});

export const inspectionTools = [takeScreenshotTool, takeSnapshotTool, takeMemorySnapshotTool];
