import puppeteer, {
  type Browser,
  type Page,
  type HTTPRequest,
  type HTTPResponse,
  type ConsoleMessage,
} from "puppeteer-core";
import type { ConsoleEntry, NetworkEntry, PageInfo } from "./types.js";

interface PageState {
  page: Page;
  consoleMessages: ConsoleEntry[];
  networkRequests: NetworkEntry[];
  nextMsgId: number;
  nextReqId: number;
}

const MAX_ENTRIES = 1000;

export class BrowserManager {
  private browser: Browser | null = null;
  private pages = new Map<number, PageState>();
  private selectedPageId = -1;
  private nextPageId = 1;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.CHROME_CDP_PORT ?? "9222", 10);
  }

  async ensureConnected(): Promise<void> {
    if (this.browser?.connected) return;

    try {
      this.browser = await puppeteer.connect({
        browserURL: `http://127.0.0.1:${this.port}`,
      });
    } catch {
      throw new Error(
        `Cannot connect to Chrome on port ${this.port}. ` +
          `Launch Chrome with: --remote-debugging-port=${this.port}`,
      );
    }

    this.browser.on("disconnected", () => {
      this.browser = null;
      this.pages.clear();
      this.selectedPageId = -1;
    });

    // Register existing pages
    const existingPages = await this.browser.pages();
    for (const page of existingPages) {
      this.registerPage(page);
    }

    // Auto-register new pages
    this.browser.on("targetcreated", async (target) => {
      if (target.type() === "page") {
        const page = await target.page();
        if (page) this.registerPage(page);
      }
    });
  }

  private registerPage(page: Page): number {
    // Check if already registered
    for (const [id, state] of this.pages) {
      if (state.page === page) return id;
    }

    const pageId = this.nextPageId++;
    const state: PageState = {
      page,
      consoleMessages: [],
      networkRequests: [],
      nextMsgId: 1,
      nextReqId: 1,
    };

    // Console listener
    page.on("console", (msg: ConsoleMessage) => {
      const entry: ConsoleEntry = {
        msgid: state.nextMsgId++,
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
        url: msg.location().url || undefined,
        lineNumber: msg.location().lineNumber || undefined,
      };
      state.consoleMessages.push(entry);
      if (state.consoleMessages.length > MAX_ENTRIES) {
        state.consoleMessages.shift();
      }
    });

    // Network listeners
    page.on("request", (req: HTTPRequest) => {
      const entry: NetworkEntry = {
        reqid: state.nextReqId++,
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        requestHeaders: req.headers(),
        timing: { startTime: Date.now() },
      };
      state.networkRequests.push(entry);
      if (state.networkRequests.length > MAX_ENTRIES) {
        state.networkRequests.shift();
      }
    });

    page.on("response", (res: HTTPResponse) => {
      const url = res.url();
      // Find matching request (latest one with same URL)
      for (let i = state.networkRequests.length - 1; i >= 0; i--) {
        const entry = state.networkRequests[i];
        if (entry.url === url && !entry.status) {
          entry.status = res.status();
          entry.statusText = res.statusText();
          entry.responseHeaders = res.headers();
          if (entry.timing) entry.timing.endTime = Date.now();
          break;
        }
      }
    });

    // Cleanup on close
    page.once("close", () => {
      this.pages.delete(pageId);
      if (this.selectedPageId === pageId) {
        const firstId = this.pages.keys().next().value;
        this.selectedPageId = firstId ?? -1;
      }
    });

    this.pages.set(pageId, state);
    if (this.selectedPageId === -1) {
      this.selectedPageId = pageId;
    }

    return pageId;
  }

  async getSelectedPage(): Promise<Page> {
    await this.ensureConnected();
    const state = this.pages.get(this.selectedPageId);
    if (!state) {
      throw new Error("No page selected. Use new_page or list_pages first.");
    }
    return state.page;
  }

  getSelectedPageState(): PageState {
    const state = this.pages.get(this.selectedPageId);
    if (!state) {
      throw new Error("No page selected.");
    }
    return state;
  }

  getPageState(pageId: number): PageState {
    const state = this.pages.get(pageId);
    if (!state) {
      throw new Error(
        `Page ${pageId} not found. Call list_pages to see available pages.`,
      );
    }
    return state;
  }

  async listPages(): Promise<PageInfo[]> {
    await this.ensureConnected();
    const result: PageInfo[] = [];
    for (const [id, state] of this.pages) {
      result.push({
        pageId: id,
        url: state.page.url(),
        title: await state.page.title(),
        selected: id === this.selectedPageId,
      });
    }
    return result;
  }

  async selectPage(pageId: number): Promise<PageInfo> {
    const state = this.getPageState(pageId);
    this.selectedPageId = pageId;
    await state.page.bringToFront();
    return {
      pageId,
      url: state.page.url(),
      title: await state.page.title(),
      selected: true,
    };
  }

  async newPage(url?: string): Promise<PageInfo> {
    await this.ensureConnected();
    const page = await this.browser!.newPage();
    const pageId = this.registerPage(page);
    this.selectedPageId = pageId;

    if (url) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    }

    return {
      pageId,
      url: page.url(),
      title: await page.title(),
      selected: true,
    };
  }

  async closePage(pageId: number): Promise<void> {
    if (this.pages.size <= 1) {
      throw new Error("Cannot close the last page.");
    }
    const state = this.getPageState(pageId);
    await state.page.close();
    // Cleanup handled by the 'close' event listener
  }

  async navigate(
    url: string,
    waitUntil: "load" | "domcontentloaded" | "networkidle0" | "networkidle2" = "domcontentloaded",
  ): Promise<void> {
    const page = await this.getSelectedPage();
    await page.goto(url, { waitUntil, timeout: 30000 });
  }

  getConsoleMessages(pageId?: number): ConsoleEntry[] {
    const state = pageId != null ? this.getPageState(pageId) : this.getSelectedPageState();
    return [...state.consoleMessages];
  }

  getNetworkRequests(pageId?: number): NetworkEntry[] {
    const state = pageId != null ? this.getPageState(pageId) : this.getSelectedPageState();
    return [...state.networkRequests];
  }

  async disconnect(): Promise<void> {
    if (this.browser) {
      this.browser.disconnect();
      this.browser = null;
      this.pages.clear();
      this.selectedPageId = -1;
    }
  }
}

export const browserManager = new BrowserManager();
