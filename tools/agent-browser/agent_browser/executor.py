"""Playwright tool executor for Agent Browser."""

from pathlib import Path

from playwright.async_api import Page


async def execute_tool(page: Page, name: str, input_data: dict) -> str:
    """Execute a single tool against the Playwright page."""
    try:
        if name == "navigate":
            url = input_data.get("url", "")
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            return f"Navigated to {url}"

        if name == "click":
            selector = input_data.get("selector", "")
            await page.click(selector, timeout=10000)
            return f"Clicked {selector}"

        if name == "type_text":
            selector = input_data.get("selector", "")
            text = input_data.get("text", "")
            await page.fill(selector, text, timeout=10000)
            return f"Typed text into {selector}"

        if name == "get_page_content":
            content = await page.inner_text("body", timeout=5000)
            max_len = 3000
            return content[:max_len] + ("..." if len(content) > max_len else "")

        if name == "screenshot":
            out_dir = Path(".") / "screenshots"
            out_dir.mkdir(exist_ok=True)
            import time
            path = out_dir / f"shot_{int(time.time())}.png"
            await page.screenshot(path=str(path))
            return f"Screenshot saved to {path}"

        return f"Unknown tool: {name}"
    except Exception as e:
        return f"Error: {type(e).__name__}: {e}"
