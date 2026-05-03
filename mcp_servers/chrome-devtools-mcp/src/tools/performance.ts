import { writeFile, readFile } from "node:fs/promises";
import { browserManager } from "../browser-manager.js";
import { textResult, type ToolResult } from "../types.js";

let traceActive = false;

// --- performance_start_trace ---
export const performanceStartTraceTool = {
  name: "performance_start_trace",
  description: "Start a Chrome performance trace (DevTools Timeline recording)",
  inputSchema: {
    type: "object" as const,
    properties: {
      categories: {
        type: "array",
        items: { type: "string" },
        description: "Trace categories (default: standard DevTools categories)",
      },
      screenshots: { type: "boolean", description: "Capture screenshots during trace (default: true)" },
    },
  },
};

export async function handlePerformanceStartTrace(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  if (traceActive) {
    return textResult("A trace is already in progress. Stop it first.");
  }

  const page = await browserManager.getSelectedPage();
  const screenshots = args.screenshots !== false;

  await page.tracing.start({
    screenshots,
    categories: args.categories as string[] | undefined,
  });

  traceActive = true;
  return textResult("Performance trace started.");
}

// --- performance_stop_trace ---
export const performanceStopTraceTool = {
  name: "performance_stop_trace",
  description: "Stop the performance trace and save results",
  inputSchema: {
    type: "object" as const,
    properties: {
      filePath: { type: "string", description: "File path to save trace JSON" },
    },
    required: ["filePath"],
  },
};

export async function handlePerformanceStopTrace(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  if (!traceActive) {
    return textResult("No trace is in progress.");
  }

  const page = await browserManager.getSelectedPage();
  const buffer = await page.tracing.stop();
  traceActive = false;

  if (!buffer) {
    return textResult("Trace stopped but no data was captured.");
  }

  const filePath = args.filePath as string;
  await writeFile(filePath, buffer);

  const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
  return textResult(`Trace saved to ${filePath} (${sizeMB}MB)`);
}

// --- performance_analyze_insight ---
export const performanceAnalyzeInsightTool = {
  name: "performance_analyze_insight",
  description: "Analyze a performance trace file and extract key metrics (LCP, CLS, TBT, etc.)",
  inputSchema: {
    type: "object" as const,
    properties: {
      filePath: { type: "string", description: "Path to trace JSON file" },
      metrics: {
        type: "array",
        items: { type: "string" },
        description: "Specific metrics to extract (e.g. ['LCP', 'CLS', 'TBT', 'FCP']). Default: all.",
      },
    },
    required: ["filePath"],
  },
};

export async function handlePerformanceAnalyzeInsight(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const filePath = args.filePath as string;
  const raw = await readFile(filePath, "utf-8");
  const trace = JSON.parse(raw);

  const events: Array<{ name: string; cat: string; ph: string; ts: number; dur?: number; args?: Record<string, unknown> }> =
    trace.traceEvents ?? trace;

  const metrics: Record<string, unknown> = {};

  // Extract key navigation/rendering events
  const navStart = events.find((e) => e.name === "navigationStart");
  const fcp = events.find((e) => e.name === "firstContentfulPaint");
  const lcp = events.find((e) => e.name === "largestContentfulPaint::Candidate");
  const domContentLoaded = events.find((e) => e.name === "domContentLoadedEventEnd");
  const loadEvent = events.find((e) => e.name === "loadEventEnd");

  const navTs = navStart?.ts ?? 0;

  if (fcp) metrics.FCP = `${((fcp.ts - navTs) / 1000).toFixed(1)}ms`;
  if (lcp) metrics.LCP = `${((lcp.ts - navTs) / 1000).toFixed(1)}ms`;
  if (domContentLoaded) metrics.DCL = `${((domContentLoaded.ts - navTs) / 1000).toFixed(1)}ms`;
  if (loadEvent) metrics.Load = `${((loadEvent.ts - navTs) / 1000).toFixed(1)}ms`;

  // Calculate Total Blocking Time (sum of long tasks > 50ms)
  const longTasks = events.filter(
    (e) => e.name === "RunTask" && e.dur && e.dur > 50000,
  );
  const tbt = longTasks.reduce((sum, t) => sum + ((t.dur ?? 0) - 50000), 0);
  metrics.TBT = `${(tbt / 1000).toFixed(1)}ms`;
  metrics.LongTasks = longTasks.length;

  // Layout shifts for CLS
  const layoutShifts = events.filter(
    (e) => e.name === "LayoutShift" && e.args && !(e.args as Record<string, unknown>).had_recent_input,
  );
  const cls = layoutShifts.reduce(
    (sum, e) => sum + ((e.args as Record<string, unknown>)?.score as number ?? 0),
    0,
  );
  metrics.CLS = cls.toFixed(4);

  // Filter by requested metrics
  const requested = args.metrics as string[] | undefined;
  if (requested?.length) {
    const filtered: Record<string, unknown> = {};
    for (const key of requested) {
      const upper = key.toUpperCase();
      for (const [k, v] of Object.entries(metrics)) {
        if (k.toUpperCase() === upper) filtered[k] = v;
      }
    }
    return textResult(JSON.stringify(filtered, null, 2));
  }

  return textResult(JSON.stringify(metrics, null, 2));
}

// --- lighthouse_audit ---
export const lighthouseAuditTool = {
  name: "lighthouse_audit",
  description: "Run a Lighthouse audit on the current page URL",
  inputSchema: {
    type: "object" as const,
    properties: {
      categories: {
        type: "array",
        items: { type: "string" },
        description: "Audit categories: performance, accessibility, best-practices, seo, pwa",
      },
      device: {
        type: "string",
        enum: ["mobile", "desktop"],
        description: "Device to emulate (default: mobile)",
      },
      filePath: { type: "string", description: "Save full report JSON to file" },
    },
  },
};

export async function handleLighthouseAudit(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const url = page.url();

  if (!url || url === "about:blank") {
    return textResult("Navigate to a page first before running Lighthouse.");
  }

  try {
    // Dynamic import - lighthouse may not be installed
    // @ts-ignore -- lighthouse is an optional dependency
    const { default: lighthouse } = await import("lighthouse");
    const categories = (args.categories as string[]) ?? [
      "performance",
      "accessibility",
      "best-practices",
      "seo",
    ];

    const flags: Record<string, unknown> = {
      port: parseInt(process.env.CHROME_CDP_PORT ?? "9222", 10),
      output: "json",
      onlyCategories: categories,
    };

    if (args.device === "desktop") {
      flags.formFactor = "desktop";
      flags.screenEmulation = { disabled: true };
    }

    const result = await lighthouse(url, flags as any);

    if (!result) {
      return textResult("Lighthouse returned no results.");
    }

    if (args.filePath) {
      await writeFile(args.filePath as string, JSON.stringify(result.lhr, null, 2));
    }

    // Summary scores
    const scores: Record<string, string> = {};
    for (const [key, cat] of Object.entries(result.lhr.categories ?? {})) {
      const category = cat as { score: number };
      scores[key] = `${Math.round(category.score * 100)}`;
    }

    return textResult(
      `Lighthouse scores for ${url}:\n` +
        Object.entries(scores)
          .map(([k, v]) => `  ${k}: ${v}/100`)
          .join("\n") +
        (args.filePath ? `\n\nFull report saved to ${args.filePath}` : ""),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Cannot find module") || msg.includes("MODULE_NOT_FOUND")) {
      return textResult(
        "Lighthouse is not installed. Install it with: npm install lighthouse",
      );
    }
    throw error;
  }
}
