import { z } from "zod";
import { openrouterFetch } from "../openrouter.js";

const ListModelsInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Case-insensitive substring filter on model id"),
  limit: z.number().int().positive().max(200).optional(),
});

export const listModelsTool = {
  name: "openrouter_list_models",
  description:
    "List models available on OpenRouter. Optionally filter by substring and limit results.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: { type: "string", description: "Substring filter on model id" },
      limit: { type: "number", description: "Max results (default 50)" },
    },
    required: [],
  },
};

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
  args: Record<string, unknown> | undefined,
) {
  try {
    const input = ListModelsInputSchema.parse(args ?? {});
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
        const pOut = m.pricing?.completion ? ` out=$${m.pricing.completion}` : "";
        return `- ${m.id}${ctx}${pIn}${pOut}`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${models.length} model(s):\n${summary}`,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: message }],
      isError: true,
    };
  }
}
