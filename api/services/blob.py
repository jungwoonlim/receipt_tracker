import os

import httpx

BLOB_READ_WRITE_TOKEN = os.getenv("BLOB_READ_WRITE_TOKEN", "")


async def upload_to_blob(filename: str, file_bytes: bytes, content_type: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.put(
            f"https://blob.vercel-storage.com/{filename}",
            content=file_bytes,
            headers={
                "Authorization": f"Bearer {BLOB_READ_WRITE_TOKEN}",
                "x-content-type": content_type,
                "x-add-random-suffix": "1",
            },
        )
        r.raise_for_status()
        return r.json()["url"]
