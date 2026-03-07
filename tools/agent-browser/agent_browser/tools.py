"""Tool definitions for Agent Browser (Anthropic tool use format)."""

TOOLS = [
    {
        "name": "navigate",
        "description": "指定したURLに移動する",
        "input_schema": {
            "type": "object",
            "properties": {"url": {"type": "string", "description": "移動先のURL"}},
            "required": ["url"],
        },
    },
    {
        "name": "click",
        "description": "指定したセレクタの要素をクリックする",
        "input_schema": {
            "type": "object",
            "properties": {"selector": {"type": "string", "description": "CSSセレクタまたはテキスト"}},
            "required": ["selector"],
        },
    },
    {
        "name": "type_text",
        "description": "指定した要素にテキストを入力する",
        "input_schema": {
            "type": "object",
            "properties": {
                "selector": {"type": "string", "description": "入力先要素のCSSセレクタ"},
                "text": {"type": "string", "description": "入力するテキスト"},
            },
            "required": ["selector", "text"],
        },
    },
    {
        "name": "get_page_content",
        "description": "現在のページのテキストコンテンツを取得する",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "screenshot",
        "description": "現在のページのスクリーンショットを撮影する",
        "input_schema": {"type": "object", "properties": {}},
    },
]
