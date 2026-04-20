export declare const chatTool: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            model: {
                type: string;
                description: string;
            };
            messages: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        role: {
                            type: string;
                            enum: string[];
                        };
                        content: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            max_tokens: {
                type: string;
            };
            temperature: {
                type: string;
            };
            top_p: {
                type: string;
            };
        };
        required: string[];
    };
};
export declare function handleChat(args: Record<string, unknown> | undefined): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError?: undefined;
} | {
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
