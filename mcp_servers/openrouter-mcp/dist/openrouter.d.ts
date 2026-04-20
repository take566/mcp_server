export declare function getApiKey(): string;
export declare function getBaseUrl(): string;
export declare function buildHeaders(): Record<string, string>;
export declare function openrouterFetch(path: string, init?: RequestInit): Promise<Response>;
