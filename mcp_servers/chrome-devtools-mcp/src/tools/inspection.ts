import { writeFile } from "node:fs/promises";
import { browserManager } from "../browser-manager.js";
import { takeSnapshot } from "../uid-resolver.js";
import { textResult, imageResult, type ToolResult } from "../types.js";

// --- take_screenshot ---
export const takeScreenshotTool = {
  name: "take_screenshot",
  description: "Take a screenshot of the current page or a specific element",
  inputSchema: {
    type: "object" as const,
    properties: {
      uid: { type: "string", description: "Element UID to screenshot (omit for full page)" },
      fullPage: { type: "boolean", description: "Capture full scrollable page" },
      format: { type: "string", enum: ["png", "jpeg", "webp"], description: "Image format (default: png)" },
      quality: { type: "number", description: "Quality for jpeg/webp (0-100)" },
      filePath: { type: "string", description: "Save screenshot to file path" },
    },
  },
};

export async function handleTakeScreenshot(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const format = (args.format as "png" | "jpeg" | "webp") ?? "png";

  const options: Record<string, unknown> = {
    type: format,
    fullPage: !!args.fullPage,
    encoding: "base64" as const,
  };

  if (args.quality != null && format !== "png") {
    options.quality = args.quality as number;
  }

  let base64: string;

  if (args.uid) {
    const { resolveUid } = await import("../uid-resolver.js");
    const element = await resolveUid(page, args.uid as string);
    base64 = (await element.screenshot(options)) as unknown as string;
  } else {
    base64 = (await page.screenshot(options)) as unknown as string;
  }

  if (args.filePath) {
    await writeFile(args.filePath as string, Buffer.from(base64, "base64"));
    return textResult(`Screenshot saved to ${args.filePath}`);
  }

  const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  return imageResult(base64, mimeType);
}

// --- take_snapshot ---
export const takeSnapshotTool = {
  name: "take_snapshot",
  description: "Take an accessibility tree snapshot of the current page. Returns a tree of elements with UIDs that can be used with interaction tools.",
  inputSchema: {
    type: "object" as const,
    properties: {
      verbose: { type: "boolean", description: "Include additional details like descriptions" },
      filePath: { type: "string", description: "Save snapshot to file path" },
    },
  },
};

export async function handleTakeSnapshot(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const snapshot = await takeSnapshot(page, !!args.verbose);

  if (args.filePath) {
    await writeFile(args.filePath as string, snapshot, "utf-8");
    return textResult(`Snapshot saved to ${args.filePath}`);
  }

  return textResult(snapshot);
}

// --- take_memory_snapshot ---
export const takeMemorySnapshotTool = {
  name: "take_memory_snapshot",
  description: "Take a heap memory snapshot (V8 heap profile) and save to file",
  inputSchema: {
    type: "object" as const,
    properties: {
      filePath: { type: "string", description: "File path to save the heap snapshot (.heapsnapshot)" },
    },
    required: ["filePath"],
  },
};

export async function handleTakeMemorySnapshot(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const client = await page.createCDPSession();

  try {
    const chunks: string[] = [];
    client.on("HeapProfiler.addHeapSnapshotChunk", (params: { chunk: string }) => {
      chunks.push(params.chunk);
    });

    await client.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
    const snapshot = chunks.join("");

    await writeFile(args.filePath as string, snapshot, "utf-8");
    return textResult(
      `Heap snapshot saved to ${args.filePath} (${(snapshot.length / 1024 / 1024).toFixed(1)}MB)`,
    );
  } finally {
    await client.detach();
  }
}
