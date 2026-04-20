import { z } from "zod";
import { openrouterFetch } from "../openrouter.js";
const MessageSchema = z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string(),
});
const ChatInputSchema = z.object({
    model: z
        .string()
        .describe("OpenRouter model slug, e.g. 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'"),
    messages: z.array(MessageSchema).min(1),
    max_tokens: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
    top_p: z.number().min(0).max(1).optional(),
});
export const chatTool = {
    name: "openrouter_chat",
    description: "Send a chat completion request to OpenRouter. Returns assistant text plus token usage.",
    inputSchema: {
        type: "object",
        properties: {
            model: {
                type: "string",
                description: "OpenRouter model slug (e.g. 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet')",
            },
            messages: {
                type: "array",
                description: "Chat messages",
                items: {
                    type: "object",
                    properties: {
                        role: { type: "string", enum: ["system", "user", "assistant"] },
                        content: { type: "string" },
                    },
                    required: ["role", "content"],
                },
            },
            max_tokens: { type: "number" },
            temperature: { type: "number" },
            top_p: { type: "number" },
        },
        required: ["model", "messages"],
    },
};
export async function handleChat(args) {
    try {
        const input = ChatInputSchema.parse(args);
        const response = await openrouterFetch("/chat/completions", {
            method: "POST",
            body: JSON.stringify(input),
        });
        const data = (await response.json());
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: message }],
            isError: true,
        };
    }
}
//# sourceMappingURL=chat.js.map