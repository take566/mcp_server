const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
export function getApiKey() {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
        throw new Error("OPENROUTER_API_KEY is not set. Export it before starting the MCP server.");
    }
    return key;
}
export function getBaseUrl() {
    return process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL;
}
export function buildHeaders() {
    const headers = {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
    };
    if (process.env.OPENROUTER_REFERER) {
        headers["HTTP-Referer"] = process.env.OPENROUTER_REFERER;
    }
    if (process.env.OPENROUTER_TITLE) {
        headers["X-Title"] = process.env.OPENROUTER_TITLE;
    }
    return headers;
}
export async function openrouterFetch(path, init = {}) {
    const url = `${getBaseUrl()}${path}`;
    const response = await fetch(url, {
        ...init,
        headers: {
            ...buildHeaders(),
            ...init.headers,
        },
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenRouter ${init.method ?? "GET"} ${path} failed: ${response.status} ${response.statusText}\n${body}`);
    }
    return response;
}
//# sourceMappingURL=openrouter.js.map