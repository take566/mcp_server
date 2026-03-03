import { z } from "zod";
// --- Schema -----------------------------------------------------------------
const HelloInputSchema = z.object({
    name: z.string().describe("Name of the person to greet"),
});
// --- Tool Definition --------------------------------------------------------
export const helloTool = {
    name: "hello",
    description: "Returns a greeting for the given name",
    inputSchema: {
        type: "object",
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
export function handleHello(args) {
    const parsed = HelloInputSchema.parse(args);
    return {
        content: [
            {
                type: "text",
                text: `Hello, ${parsed.name}! Welcome to the MCP server.`,
            },
        ],
    };
}
//# sourceMappingURL=hello.js.map