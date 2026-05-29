import asyncio
import json
from datetime import date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.models.receipt import Receipt, ReceiptCreate, ReceiptRead, ReceiptUpdate
from api.services.blob import upload_to_blob
from api.services.ocr import extract_receipt, normalize_receipt_fields

router = APIRouter()

_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
}


@router.post("/ocr", response_model=ReceiptRead)
async def ocr_receipt(file: UploadFile = File(...)):
    """
    Upload a receipt image/PDF → Upstage OCR → return extracted fields for preview.
    Does NOT save to the database. Call POST /api/receipts/ to save.
    """
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식: {file.content_type}. JPEG, PNG, WEBP, GIF, PDF만 가능합니다.",
        )

    file_bytes = await file.read()

    raw, image_url = await asyncio.gather(
        extract_receipt(file_bytes),
        upload_to_blob(file.filename or "receipt", file_bytes, file.content_type or "application/octet-stream"),
        return_exceptions=True,
    )

    if isinstance(image_url, Exception):
        image_url = None  # BLOB_READ_WRITE_TOKEN 미설정 시 graceful degradation
    if isinstance(raw, Exception):
        raise HTTPException(status_code=502, detail="OCR 처리 실패")

    normalized = normalize_receipt_fields(raw)

    import datetime
    now = datetime.datetime.utcnow()

    return ReceiptRead(
        id=0,
        vendor=normalized.get("vendor"),
        date=normalized.get("date"),
        total=normalized.get("total"),
        tax=normalized.get("tax"),
        currency=normalized.get("currency", "KRW"),
        items=normalized.get("items"),
        image_url=image_url,
        ocr_raw=json.dumps(raw, ensure_ascii=False),
        created_at=now,
        updated_at=now,
    )


@router.post("/", response_model=ReceiptRead, status_code=201)
async def create_receipt(body: ReceiptCreate, db: AsyncSession = Depends(get_db)):
    """Save a confirmed receipt to the database."""
    items_json = (
        json.dumps([item.model_dump() for item in body.items], ensure_ascii=False)
        if body.items
        else None
    )
    receipt = Receipt(
        vendor=body.vendor,
        date=body.date,
        total=body.total,
        tax=body.tax,
        currency=body.currency,
        category=body.category,
        items_json=items_json,
        ocr_raw=body.ocr_raw,
        image_url=body.image_url,
        notes=body.notes,
    )
    db.add(receipt)
    await db.commit()
    await db.refresh(receipt)
    return receipt


@router.get("/", response_model=list[ReceiptRead])
async def list_receipts(
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None,
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    db: AsyncSession = Depends(get_db),
):
    """List receipts with optional filters."""
    stmt = select(Receipt).order_by(Receipt.created_at.desc())
    if category:
        stmt = stmt.where(Receipt.category == category)
    if date_from:
        stmt = stmt.where(Receipt.date >= date_from)
    if date_to:
        stmt = stmt.where(Receipt.date <= date_to)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{receipt_id}", response_model=ReceiptRead)
async def get_receipt(receipt_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single receipt by ID."""
    receipt = await db.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")
    return receipt


@router.patch("/{receipt_id}", response_model=ReceiptRead)
async def update_receipt(
    receipt_id: int, body: ReceiptUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a receipt. Only provided fields are updated."""
    receipt = await db.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")

    update_data = body.model_dump(exclude_unset=True)
    if "items" in update_data:
        items = update_data.pop("items")
        receipt.items_json = (
            json.dumps(items, ensure_ascii=False) if items is not None else None
        )
    for field, value in update_data.items():
        setattr(receipt, field, value)

    await db.commit()
    await db.refresh(receipt)
    return receipt


@router.delete("/{receipt_id}", status_code=204)
async def delete_receipt(receipt_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a receipt."""
    receipt = await db.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")
    await db.delete(receipt)
    await db.commit()
