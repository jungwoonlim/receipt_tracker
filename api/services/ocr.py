import base64
import json
import os
from typing import Any

import httpx

UPSTAGE_API_KEY = os.getenv("UPSTAGE_API_KEY", "")
UPSTAGE_URL = "https://api.upstage.ai/v1/information-extraction"

# JSON schema used for receipt extraction via information-extract model
_RECEIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "vendor": {
            "type": "string",
            "description": "Store or vendor name",
        },
        "date": {
            "type": "string",
            "description": "Receipt date (YYYY-MM-DD)",
        },
        "total": {
            "type": "number",
            "description": "Total amount paid",
        },
        "tax": {
            "type": "number",
            "description": "Tax amount",
        },
        "currency": {
            "type": "string",
            "description": "Currency code (e.g. KRW, USD)",
        },
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "qty": {"type": "number"},
                    "price": {"type": "number"},
                },
            },
            "description": "List of purchased items with names and prices",
        },
    },
}


async def extract_receipt(file_bytes: bytes) -> dict[str, Any]:
    """
    Extract structured receipt data using Upstage information-extract model.
    Sends image as base64 in JSON body with a receipt-specific JSON schema.
    Returns the raw API response dict.
    """
    b64 = base64.b64encode(file_bytes).decode()
    payload = {
        "model": "information-extract",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:application/octet-stream;base64,{b64}"
                        },
                    }
                ],
            }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "receipt",
                "schema": _RECEIPT_SCHEMA,
            },
        },
    }
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            UPSTAGE_URL,
            headers={
                "Authorization": f"Bearer {UPSTAGE_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()
        return response.json()


def normalize_receipt_fields(ocr_response: dict[str, Any]) -> dict[str, Any]:
    """
    Parse choices[0].message.content (stringified JSON) from the
    information-extract response into a flat dict matching ReceiptCreate.
    """
    choices = ocr_response.get("choices", [])
    if not choices:
        return {}
    content = choices[0].get("message", {}).get("content", "{}")
    try:
        return json.loads(content)
    except (json.JSONDecodeError, TypeError):
        return {}
