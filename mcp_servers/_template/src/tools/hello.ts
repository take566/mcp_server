import { z } from "zod";

// --- Schema -----------------------------------------------------------------

const HelloInputSchema = z.object({
  name: z.string().describe("Name of the person to greet"),
});

type HelloInput = z.infer<typeof HelloInputSchema>;

// --- Tool Definition --------------------------------------------------------

export const helloTool = {
  name: "hello",
  description: "Returns a greeting for the given name",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Name of the person to greet",
      },
    },
    required: ["name"],
  },
};

// --- Handler ----------------------------------------------------------------

export function handleHello(args: Record<string, unknown> | undefined) {
  const parsed = HelloInputSchema.parse(args);

  return {
    content: [
      {
        type: "text" as const,
        text: `Hello, ${parsed.name}! Welcome to the MCP server.`,
      },
    ],
  };
}
