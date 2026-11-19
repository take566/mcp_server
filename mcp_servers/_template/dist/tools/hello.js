import { z } from "zod";
// --- Schemas ----------------------------------------------------------------
export const helloInputSchema = {
    name: z.string().min(1).describe("Name of the person to greet"),
};
export const helloOutputSchema = {
    greeting: z.string().describe("The greeting message"),
};
// --- Handler (pure, easy to unit test) --------------------------------------
export function hello({ name }) {
    return { greeting: `Hello, ${name}! Welcome to the MCP server.` };
}
// --- Registration -----------------------------------------------------------
export function registerHelloTool(server) {
    server.registerTool("hello", {
        title: "Hello",
        description: "Returns a greeting for the given name",
        inputSchema: helloInputSchema,
        outputSchema: helloOutputSchema,
    }, async (args) => {
        const result = hello(args);
        return {
            content: [{ type: "text", text: result.greeting }],
            structuredContent: result,
        };
    });
}
//# sourceMappingURL=hello.js.map