import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
export declare const chatInputShape: {
    model: z.ZodString;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "system" | "user" | "assistant";
        content: string;
    }, {
        role: "system" | "user" | "assistant";
        content: string;
    }>, "many">;
    max_tokens: z.ZodOptional<z.ZodEffects<z.ZodNumber, number, number>>;
    temperature: z.ZodOptional<z.ZodEffects<z.ZodNumber, number, number>>;
    top_p: z.ZodOptional<z.ZodEffects<z.ZodNumber, number, number>>;
};
type ChatInput = z.infer<z.ZodObject<typeof chatInputShape>>;
export declare function handleChat(input: ChatInput): Promise<CallToolResult>;
export declare function registerChatTool(server: McpServer): void;
export {};
