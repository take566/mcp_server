import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { openrouterFetch } from "../openrouter.js";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

// Integer / range checks use refine so the advertised JSON Schema type stays "number".
export const chatInputShape = {
  model: z
    .string()
    .describe(
      "OpenRouter model slug (e.g. 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet')",
    ),
  messages: z.array(MessageSchema).min(1).describe("Chat messages"),
  max_tokens: z
    .number()
    .refine((n) => Number.isInteger(n) && n > 0, "must be a positive integer")
    .optional(),
  temperature: z
    .number()
    .refine((n) => n >= 0 && n <= 2, "must be between 0 and 2")
    .optional(),
  top_p: z
    .number()
    .refine((n) => n >= 0 && n <= 1, "must be between 0 and 1")
    .optional(),
};

type ChatInput = z.infer<z.ZodObject<typeof chatInputShape>>;

interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message?: { role: string; content: string | null };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export async function handleChat(input: ChatInput): Promise<CallToolResult> {
  try {
    const response = await openrouterFetch("/chat/completions", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const data = (await response.json()) as ChatCompletionResponse;
    const text = data.choices[0]?.message?.content ?? "";
    const usage = data.usage ?? {};

    return {
      content: [
        { type: "text", text },
        {
          type: "text",
          text: `\n---\nmodel: ${data.model}\nusage: ${JSON.stringify(usage)}`,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerChatTool(server: McpServer): void {
  server.registerTool(
    "openrouter_chat",
    {
      description:
        "Send a chat completion request to OpenRouter. Returns assistant text plus token usage.",
      inputSchema: chatInputShape,
    },
    (args) => handleChat(args),
  );
}
