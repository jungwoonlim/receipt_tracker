import json
from datetime import date as date_type
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator
from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from api.database import Base


# ---------------------------------------------------------------------------
# SQLAlchemy ORM model
# ---------------------------------------------------------------------------

class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )

    vendor: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    date: Mapped[Optional[date_type]] = mapped_column(nullable=True)
    total: Mapped[Optional[float]] = mapped_column(nullable=True)
    tax: Mapped[Optional[float]] = mapped_column(nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="KRW")
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Line items serialized as JSON text
    items_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Raw Upstage OCR response (for debugging / re-processing)
    ocr_raw: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Optional image URL (e.g. Supabase Storage)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class LineItem(BaseModel):
    name: str
    qty: Optional[float] = None
    price: Optional[float] = None


class ReceiptBase(BaseModel):
    vendor: Optional[str] = None
    date: Optional[date_type] = None
    total: Optional[float] = None
    tax: Optional[float] = None
    currency: str = "KRW"
    category: Optional[str] = None
    items: Optional[list[LineItem]] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None


class ReceiptCreate(ReceiptBase):
    ocr_raw: Optional[str] = None


class ReceiptUpdate(ReceiptBase):
    pass


class ReceiptRead(ReceiptBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def deserialize_items(cls, values):
        # When loading from ORM, items_json → items
        if hasattr(values, "__dict__"):
            raw = getattr(values, "items_json", None)
            if raw:
                try:
                    values.__dict__["items"] = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    values.__dict__["items"] = None
        return values
