import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { openrouterFetch } from "../openrouter.js";

// Integer / range checks use refine so the advertised JSON Schema type stays "number".
export const listModelsInputShape = {
  query: z.string().optional().describe("Substring filter on model id"),
  limit: z
    .number()
    .refine(
      (n) => Number.isInteger(n) && n > 0 && n <= 200,
      "must be an integer between 1 and 200",
    )
    .optional()
    .describe("Max results (default 50)"),
};

type ListModelsInput = z.infer<z.ZodObject<typeof listModelsInputShape>>;

interface ModelInfo {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

interface ModelListResponse {
  data: ModelInfo[];
}

export async function handleListModels(
  input: ListModelsInput,
): Promise<CallToolResult> {
  try {
    const response = await openrouterFetch("/models");
    const data = (await response.json()) as ModelListResponse;

    let models = data.data;
    if (input.query) {
      const q = input.query.toLowerCase();
      models = models.filter((m) => m.id.toLowerCase().includes(q));
    }
    const limit = input.limit ?? 50;
    models = models.slice(0, limit);

    const summary = models
      .map((m) => {
        const ctx = m.context_length ? ` ctx=${m.context_length}` : "";
        const pIn = m.pricing?.prompt ? ` in=$${m.pricing.prompt}` : "";
        const pOut = m.pricing?.completion
          ? ` out=$${m.pricing.completion}`
          : "";
        return `- ${m.id}${ctx}${pIn}${pOut}`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${models.length} model(s):\n${summary}`,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function registerListModelsTool(server: McpServer): void {
  server.registerTool(
    "openrouter_list_models",
    {
      description:
        "List models available on OpenRouter. Optionally filter by substring and limit results.",
      inputSchema: listModelsInputShape,
    },
    (args) => handleListModels(args),
  );
}
