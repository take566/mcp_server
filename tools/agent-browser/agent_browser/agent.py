"""Agent loop: LLM (Anthropic) + tool execution (Playwright)."""

from anthropic import Anthropic
from playwright.async_api import Page

from agent_browser.executor import execute_tool
from agent_browser.tools import TOOLS

# Anthropic message content types
ROLE_USER = "user"
ROLE_ASSISTANT = "assistant"
BLOCK_TEXT = "text"
BLOCK_TOOL_USE = "tool_use"
STOP_END_TURN = "end_turn"
STOP_TOOL_USE = "tool_use"

DEFAULT_MODEL = "claude-sonnet-4-20250514"
DEFAULT_MAX_TOKENS = 4096
DEFAULT_MAX_STEPS = 30


def _content_block_to_dict(block) -> dict:
    """Convert SDK content block to API-friendly dict."""
    t = getattr(block, "type", None)
    if t == BLOCK_TEXT:
        return {"type": "text", "text": getattr(block, "text", "") or ""}
    if t == BLOCK_TOOL_USE:
        inp = getattr(block, "input", None)
        if isinstance(inp, str):
            import json
            try:
                inp = json.loads(inp) if inp else {}
            except json.JSONDecodeError:
                inp = {}
        return {
            "type": "tool_use",
            "id": getattr(block, "id", ""),
            "name": getattr(block, "name", ""),
            "input": inp or {},
        }
    return {"type": t or "text", "text": str(block)}


async def run_agent(
    page: Page,
    task: str,
    *,
    model: str = DEFAULT_MODEL,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    max_steps: int = DEFAULT_MAX_STEPS,
    api_key: str | None = None,
) -> str:
    """
    Run the agent loop: send task to Claude, execute tool calls, repeat until end_turn.
    Returns the final assistant text reply, or the last tool results if no final reply.
    """
    client = Anthropic(api_key=api_key)
    messages: list[dict] = [{"role": ROLE_USER, "content": task}]
    last_text = ""

    for _step in range(max_steps):
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == STOP_END_TURN:
            for block in response.content:
                if getattr(block, "type", None) == BLOCK_TEXT:
                    last_text = getattr(block, "text", "") or ""
            break

        if response.stop_reason != STOP_TOOL_USE:
            last_text = str(response.stop_reason or "Unknown stop")
            break

        # Append assistant message (content as list of dicts for API)
        messages.append({
            "role": ROLE_ASSISTANT,
            "content": [_content_block_to_dict(b) for b in response.content],
        })

        # Execute each tool_use and append tool_result
        tool_results: list[dict] = []
        for block in response.content:
            if getattr(block, "type", None) != BLOCK_TOOL_USE:
                continue
            tool_id = getattr(block, "id", "")
            tool_name = getattr(block, "name", "")
            tool_input = getattr(block, "input", None) or {}
            if isinstance(tool_input, str):
                import json
                try:
                    tool_input = json.loads(tool_input) if tool_input else {}
                except json.JSONDecodeError:
                    tool_input = {}
            result = await execute_tool(page, tool_name, tool_input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_id,
                "content": result,
            })

        messages.append({"role": ROLE_USER, "content": tool_results})

        for block in response.content:
            if getattr(block, "type", None) == BLOCK_TEXT:
                last_text = getattr(block, "text", "") or ""

    return last_text or "(No final reply)"
