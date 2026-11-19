import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
export declare const listModelsInputShape: {
    query: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodEffects<z.ZodNumber, number, number>>;
};
type ListModelsInput = z.infer<z.ZodObject<typeof listModelsInputShape>>;
export declare function handleListModels(input: ListModelsInput): Promise<CallToolResult>;
export declare function registerListModelsTool(server: McpServer): void;
export {};
