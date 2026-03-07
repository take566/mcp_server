"""CLI entry point for Agent Browser."""

import argparse
import asyncio
import os

from playwright.async_api import async_playwright

from agent_browser.agent import run_agent


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Agent Browser: LLM-driven browser automation (Playwright + Anthropic)"
    )
    parser.add_argument(
        "task",
        nargs="?",
        default="Open https://example.com and tell me the page heading.",
        help="Task to run (e.g. open URL and summarize content)",
    )
    parser.add_argument(
        "--model",
        default="claude-sonnet-4-20250514",
        help="Anthropic model name",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run browser in headless mode",
    )
    parser.add_argument(
        "--max-steps",
        type=int,
        default=30,
        help="Maximum agent steps (default: 30)",
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("ANTHROPIC_API_KEY"),
        help="Anthropic API key (default: ANTHROPIC_API_KEY env)",
    )
    args = parser.parse_args()

    if not args.api_key:
        print("Error: ANTHROPIC_API_KEY is not set. Set the env var or use --api-key.")
        raise SystemExit(1)

    async def _run() -> None:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=args.headless)
            page = await browser.new_page()
            try:
                result = await run_agent(
                    page,
                    args.task,
                    model=args.model,
                    max_steps=args.max_steps,
                    api_key=args.api_key,
                )
                print(result)
            finally:
                await browser.close()

    asyncio.run(_run())


if __name__ == "__main__":
    main()
