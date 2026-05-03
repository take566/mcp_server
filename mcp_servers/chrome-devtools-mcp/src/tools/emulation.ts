import { browserManager } from "../browser-manager.js";
import { textResult, type ToolResult } from "../types.js";

// --- emulate ---
export const emulateTool = {
  name: "emulate",
  description: "Emulate device/network conditions, geolocation, user agent, or media features",
  inputSchema: {
    type: "object" as const,
    properties: {
      viewport: {
        type: "object",
        properties: {
          width: { type: "number" },
          height: { type: "number" },
          deviceScaleFactor: { type: "number" },
          isMobile: { type: "boolean" },
          hasTouch: { type: "boolean" },
        },
        description: "Viewport dimensions and device flags",
      },
      userAgent: { type: "string", description: "User agent string" },
      geolocation: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" },
          accuracy: { type: "number" },
        },
        description: "Geolocation coordinates",
      },
      colorScheme: {
        type: "string",
        enum: ["light", "dark", "no-preference"],
        description: "Preferred color scheme",
      },
      cpuThrottling: { type: "number", description: "CPU throttling rate (1 = no throttle, 4 = 4x slowdown)" },
      networkConditions: {
        type: "object",
        properties: {
          offline: { type: "boolean" },
          downloadThroughput: { type: "number", description: "bytes/s" },
          uploadThroughput: { type: "number", description: "bytes/s" },
          latency: { type: "number", description: "ms" },
        },
        description: "Network throttling conditions",
      },
    },
  },
};

export async function handleEmulate(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const applied: string[] = [];

  if (args.viewport) {
    const vp = args.viewport as {
      width: number;
      height: number;
      deviceScaleFactor?: number;
      isMobile?: boolean;
      hasTouch?: boolean;
    };
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.deviceScaleFactor ?? 1,
      isMobile: vp.isMobile ?? false,
      hasTouch: vp.hasTouch ?? false,
    });
    applied.push(`viewport: ${vp.width}x${vp.height}`);
  }

  if (args.userAgent) {
    await page.setUserAgent(args.userAgent as string);
    applied.push("userAgent");
  }

  if (args.geolocation) {
    const geo = args.geolocation as { latitude: number; longitude: number; accuracy?: number };
    await page.setGeolocation(geo);
    applied.push(`geolocation: ${geo.latitude},${geo.longitude}`);
  }

  if (args.colorScheme) {
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: args.colorScheme as string },
    ]);
    applied.push(`colorScheme: ${args.colorScheme}`);
  }

  if (args.cpuThrottling) {
    await page.emulateCPUThrottling(args.cpuThrottling as number);
    applied.push(`cpuThrottling: ${args.cpuThrottling}x`);
  }

  if (args.networkConditions) {
    const nc = args.networkConditions as {
      offline?: boolean;
      downloadThroughput?: number;
      uploadThroughput?: number;
      latency?: number;
    };
    const client = await page.createCDPSession();
    await client.send("Network.emulateNetworkConditions", {
      offline: nc.offline ?? false,
      downloadThroughput: nc.downloadThroughput ?? -1,
      uploadThroughput: nc.uploadThroughput ?? -1,
      latency: nc.latency ?? 0,
    });
    await client.detach();
    applied.push("networkConditions");
  }

  return textResult(`Emulation applied: ${applied.join(", ") || "nothing"}`);
}

// --- resize_page ---
export const resizePageTool = {
  name: "resize_page",
  description: "Resize the browser viewport",
  inputSchema: {
    type: "object" as const,
    properties: {
      width: { type: "number", description: "Viewport width in pixels" },
      height: { type: "number", description: "Viewport height in pixels" },
    },
    required: ["width", "height"],
  },
};

export async function handleResizePage(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  await page.setViewport({
    width: args.width as number,
    height: args.height as number,
  });
  return textResult(`Viewport resized to ${args.width}x${args.height}`);
}

// --- wait_for ---
export const waitForTool = {
  name: "wait_for",
  description: "Wait for a CSS selector, XPath, or navigation event",
  inputSchema: {
    type: "object" as const,
    properties: {
      selector: { type: "string", description: "CSS selector to wait for" },
      xpath: { type: "string", description: "XPath expression to wait for" },
      navigation: { type: "boolean", description: "Wait for next navigation" },
      timeout: { type: "number", description: "Timeout in milliseconds (default: 30000)" },
      visible: { type: "boolean", description: "Wait for element to be visible" },
      hidden: { type: "boolean", description: "Wait for element to be hidden" },
    },
  },
};

export async function handleWaitFor(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const page = await browserManager.getSelectedPage();
  const timeout = (args.timeout as number) ?? 30000;

  if (args.navigation) {
    await page.waitForNavigation({ timeout });
    return textResult(`Navigation complete: ${page.url()}`);
  }

  if (args.selector) {
    await page.waitForSelector(args.selector as string, {
      timeout,
      visible: args.visible as boolean | undefined,
      hidden: args.hidden as boolean | undefined,
    });
    return textResult(`Element found: ${args.selector}`);
  }

  if (args.xpath) {
    await page.waitForSelector(`::-p-xpath(${args.xpath})`, { timeout });
    return textResult(`XPath matched: ${args.xpath}`);
  }

  return textResult("No wait condition specified. Provide selector, xpath, or navigation.");
}
