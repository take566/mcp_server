export declare const helloTool: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            name: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare function handleHello(args: Record<string, unknown> | undefined): {
    content: {
        type: "text";
        text: string;
    }[];
};
