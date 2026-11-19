import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
export declare const helloInputSchema: {
    name: z.ZodString;
};
export declare const helloOutputSchema: {
    greeting: z.ZodString;
};
export declare function hello({ name }: {
    name: string;
}): {
    greeting: string;
};
export declare function registerHelloTool(server: McpServer): void;
