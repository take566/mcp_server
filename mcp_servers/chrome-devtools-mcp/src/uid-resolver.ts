import type { Page, ElementHandle } from "puppeteer-core";

interface AXNode {
  nodeId: string;
  role: { value: string };
  name?: { value: string };
  description?: { value: string };
  value?: { value: string };
  children?: string[];
  backendDOMNodeId?: number;
}

interface UIDNode {
  uid: string;
  role: string;
  name: string;
  description?: string;
  value?: string;
  backendDOMNodeId?: number;
  children: UIDNode[];
}

let cachedTree: UIDNode[] = [];
let cachedTimestamp = 0;
const CACHE_TTL = 2000;

export async function takeSnapshot(
  page: Page,
  verbose = false,
): Promise<string> {
  const client = await page.createCDPSession();
  try {
    const { nodes } = (await client.send("Accessibility.getFullAXTree")) as {
      nodes: AXNode[];
    };

    const nodeMap = new Map<string, AXNode>();
    for (const node of nodes) {
      nodeMap.set(node.nodeId, node);
    }

    let uidCounter = 0;
    const buildTree = (axNode: AXNode): UIDNode | null => {
      const role = axNode.role?.value ?? "unknown";
      if (role === "none" || role === "GenericContainer") return null;

      const name = axNode.name?.value ?? "";
      if (!verbose && !name && !axNode.value?.value && role === "group") return null;

      const uid = `e${uidCounter++}`;
      const children: UIDNode[] = [];

      if (axNode.children) {
        for (const childId of axNode.children) {
          const childNode = nodeMap.get(childId);
          if (childNode) {
            const child = buildTree(childNode);
            if (child) children.push(child);
          }
        }
      }

      return {
        uid,
        role,
        name,
        description: axNode.description?.value,
        value: axNode.value?.value,
        backendDOMNodeId: axNode.backendDOMNodeId,
        children,
      };
    };

    const rootAx = nodes[0];
    const tree: UIDNode[] = [];
    if (rootAx) {
      const root = buildTree(rootAx);
      if (root) tree.push(root);
    }

    cachedTree = tree;
    cachedTimestamp = Date.now();

    return formatTree(tree, verbose);
  } finally {
    await client.detach();
  }
}

function formatTree(
  nodes: UIDNode[],
  verbose: boolean,
  indent = 0,
): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const node of nodes) {
    let line = `${prefix}[${node.uid}] ${node.role}`;
    if (node.name) line += ` "${node.name}"`;
    if (node.value) line += ` value="${node.value}"`;
    if (verbose && node.description) line += ` desc="${node.description}"`;
    lines.push(line);

    if (node.children.length > 0) {
      lines.push(formatTree(node.children, verbose, indent + 1));
    }
  }

  return lines.join("\n");
}

function findNodeByUid(nodes: UIDNode[], uid: string): UIDNode | null {
  for (const node of nodes) {
    if (node.uid === uid) return node;
    const found = findNodeByUid(node.children, uid);
    if (found) return found;
  }
  return null;
}

export async function resolveUid(
  page: Page,
  uid: string,
): Promise<ElementHandle<Element>> {
  // Refresh cache if stale
  if (Date.now() - cachedTimestamp > CACHE_TTL) {
    await takeSnapshot(page);
  }

  const node = findNodeByUid(cachedTree, uid);
  if (!node || !node.backendDOMNodeId) {
    throw new Error(
      `Element with uid '${uid}' not found. Take a fresh snapshot to get current UIDs.`,
    );
  }

  const client = await page.createCDPSession();
  try {
    // Resolve backend node to a JS remote object
    const { object } = await client.send("DOM.resolveNode", {
      backendNodeId: node.backendDOMNodeId,
    });

    if (!object.objectId) {
      throw new Error(`Cannot resolve DOM node for uid '${uid}'.`);
    }

    // Use Runtime.callFunctionOn to get a handle we can work with
    const { result } = await client.send("Runtime.callFunctionOn", {
      objectId: object.objectId,
      functionDeclaration: "function() { return this; }",
      returnByValue: false,
    });

    if (!result.objectId) {
      throw new Error(`Cannot get element handle for uid '${uid}'.`);
    }

    // Create an ElementHandle from the remote object via page context
    // Fallback: use aria selector based on role and name
    const name = node.name;
    const role = node.role;

    if (name) {
      // Try aria selector first
      const ariaHandle = await page.$(`aria/${name}`).catch(() => null);
      if (ariaHandle) return ariaHandle;
    }

    // Fallback: query by role and name via DOM
    const handle = await page.evaluateHandle(
      (searchRole: string, searchName: string) => {
        const all = document.querySelectorAll("*");
        for (const el of all) {
          const elRole =
            el.getAttribute("role") ?? el.tagName.toLowerCase();
          const elName =
            el.getAttribute("aria-label") ??
            (el as HTMLElement).innerText?.trim().slice(0, 200) ??
            "";
          if (
            (elRole === searchRole ||
              el.tagName.toLowerCase() === searchRole.toLowerCase()) &&
            elName.includes(searchName)
          ) {
            return el;
          }
        }
        return null;
      },
      role,
      name,
    );

    const element = handle.asElement();
    if (element) return element as ElementHandle<Element>;
    await handle.dispose();

    throw new Error(
      `Cannot create element handle for uid '${uid}'. Try taking a fresh snapshot.`,
    );
  } finally {
    await client.detach();
  }
}
