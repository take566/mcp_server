import { z } from "zod";
import { browserManager } from "../browser-manager.js";
import { defineTool, textResult } from "../types.js";

export const emulateTool = defineTool({
  name: "emulate",
  description: "Emulate device/network conditions, geolocation, user agent, or media features",
  inputSchema: {
    viewport: z
      .object({
        width: z.number().optional(),
        height: z.number().optional(),
        deviceScaleFactor: z.number().optional(),
        isMobile: z.boolean().optional(),
        hasTouch: z.boolean().optional(),
      })
      .optional()
      .describe("Viewport dimensions and device flags"),
    userAgent: z.string().optional().describe("User agent string"),
    geolocation: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        accuracy: z.number().optional(),
      })
      .optional()
      .describe("Geolocation coordinates"),
    colorScheme: z
      .enum(["light", "dark", "no-preference"])
      .optional()
      .describe("Preferred color scheme"),
    cpuThrottling: z
      .number()
      .optional()
      .describe("CPU throttling rate (1 = no throttle, 4 = 4x slowdown)"),
    networkConditions: z
      .object({
        offline: z.boolean().optional(),
        downloadThroughput: z.number().optional().describe("bytes/s"),
        uploadThroughput: z.number().optional().describe("bytes/s"),
        latency: z.number().optional().describe("ms"),
      })
      .optional()
      .describe("Network throttling conditions"),
  },
  handler: async ({ viewport, userAgent, geolocation, colorScheme, cpuThrottling, networkConditions }) => {
    if (viewport && (viewport.width == null || viewport.height == null)) {
      throw new Error("viewport requires both width and height.");
    }
    if (geolocation && (geolocation.latitude == null || geolocation.longitude == null)) {
      throw new Error("geolocation requires both latitude and longitude.");
    }

    const page = await browserManager.getSelectedPage();
    const applied: string[] = [];

    if (viewport?.width != null && viewport.height != null) {
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
        isMobile: viewport.isMobile ?? false,
        hasTouch: viewport.hasTouch ?? false,
      });
      applied.push(`viewport: ${viewport.width}x${viewport.height}`);
    }

    if (userAgent) {
      await page.setUserAgent(userAgent);
      applied.push("userAgent");
    }

    if (geolocation?.latitude != null && geolocation.longitude != null) {
      await page.setGeolocation({
        latitude: geolocation.latitude,
        longitude: geolocation.longitude,
        accuracy: geolocation.accuracy,
      });
      applied.push(`geolocation: ${geolocation.latitude},${geolocation.longitude}`);
    }

    if (colorScheme) {
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: colorScheme }]);
      applied.push(`colorScheme: ${colorScheme}`);
    }

    if (cpuThrottling) {
      await page.emulateCPUThrottling(cpuThrottling);
      applied.push(`cpuThrottling: ${cpuThrottling}x`);
    }

    if (networkConditions) {
      const client = await page.createCDPSession();
      try {
        await client.send("Network.emulateNetworkConditions", {
          offline: networkConditions.offline ?? false,
          downloadThroughput: networkConditions.downloadThroughput ?? -1,
          uploadThroughput: networkConditions.uploadThroughput ?? -1,
          latency: networkConditions.latency ?? 0,
        });
      } finally {
        await client.detach();
      }
      applied.push("networkConditions");
    }

    return textResult(`Emulation applied: ${applied.join(", ") || "nothing"}`);
  },
});

export const resizePageTool = defineTool({
  name: "resize_page",
  description: "Resize the browser viewport",
  inputSchema: {
    width: z.number().describe("Viewport width in pixels"),
    height: z.number().describe("Viewport height in pixels"),
  },
  handler: async ({ width, height }) => {
    const page = await browserManager.getSelectedPage();
    await page.setViewport({ width, height });
    return textResult(`Viewport resized to ${width}x${height}`);
  },
});

export const waitForTool = defineTool({
  name: "wait_for",
  description: "Wait for a CSS selector, XPath, or navigation event",
  inputSchema: {
    selector: z.string().optional().describe("CSS selector to wait for"),
    xpath: z.string().optional().describe("XPath expression to wait for"),
    navigation: z.boolean().optional().describe("Wait for next navigation"),
    timeout: z.number().optional().describe("Timeout in milliseconds (default: 30000)"),
    visible: z.boolean().optional().describe("Wait for element to be visible"),
    hidden: z.boolean().optional().describe("Wait for element to be hidden"),
  },
  handler: async ({ selector, xpath, navigation, timeout: timeoutArg, visible, hidden }) => {
    const page = await browserManager.getSelectedPage();
    const timeout = timeoutArg ?? 30000;

    if (navigation) {
      await page.waitForNavigation({ timeout });
      return textResult(`Navigation complete: ${page.url()}`);
    }

    if (selector) {
      await page.waitForSelector(selector, { timeout, visible, hidden });
      return textResult(`Element found: ${selector}`);
    }

    if (xpath) {
      await page.waitForSelector(`::-p-xpath(${xpath})`, { timeout });
      return textResult(`XPath matched: ${xpath}`);
    }

    return textResult("No wait condition specified. Provide selector, xpath, or navigation.");
  },
});

export const emulationTools = [emulateTool, resizePageTool, waitForTool];
