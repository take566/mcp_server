from typing import Any
import httpx
import asyncio
import mcp.server.stdio
import mcp.types

# Initialize MCP server
app = mcp.server.stdio.create_stdio_server()

# Constants
NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"
