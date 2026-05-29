from datetime import date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import DATABASE_URL, get_db
from api.models.receipt import Receipt

router = APIRouter()


@router.get("/summary")
async def spending_summary(
    year: int = Query(..., description="Year to summarize (e.g. 2025)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Optional month filter"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Returns:
    - total_spend: sum of all receipt totals in the period
    - by_category: dict mapping category → total spend
    - monthly_series: list of {month, total} for the given year
    """
    # Base filter: year (and optional month)
    date_from = date_type(year, month or 1, 1)
    if month:
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        date_to = date_type(year, month, last_day)
    else:
        date_to = date_type(year, 12, 31)

    # Total spend
    total_stmt = select(func.coalesce(func.sum(Receipt.total), 0)).where(
        Receipt.date >= date_from,
        Receipt.date <= date_to,
    )
    total_result = await db.execute(total_stmt)
    total_spend = float(total_result.scalar() or 0)

    # By category
    cat_stmt = (
        select(Receipt.category, func.sum(Receipt.total).label("cat_total"))
        .where(Receipt.date >= date_from, Receipt.date <= date_to)
        .where(Receipt.total.is_not(None))
        .group_by(Receipt.category)
    )
    cat_result = await db.execute(cat_stmt)
    by_category = {
        (row.category or "미분류"): float(row.cat_total or 0)
        for row in cat_result
    }

    # Monthly series (always full year regardless of month filter)
    if "sqlite" in DATABASE_URL:
        month_expr = func.strftime("%Y-%m", Receipt.date)
    else:
        month_expr = func.to_char(func.date_trunc("month", Receipt.date), "YYYY-MM")

    monthly_stmt = (
        select(month_expr.label("month"), func.sum(Receipt.total).label("month_total"))
        .where(Receipt.date >= date_type(year, 1, 1), Receipt.date <= date_type(year, 12, 31))
        .where(Receipt.total.is_not(None))
        .group_by(month_expr)
        .order_by("month")
    )
    monthly_result = await db.execute(monthly_stmt)
    monthly_series = [
        {"month": row.month, "total": float(row.month_total or 0)}
        for row in monthly_result
    ]

    return {
        "total_spend": total_spend,
        "by_category": by_category,
        "monthly_series": monthly_series,
    }


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[str]:
    """Return distinct non-null categories for filter dropdowns."""
    stmt = (
        select(Receipt.category)
        .where(Receipt.category.is_not(None))
        .distinct()
        .order_by(Receipt.category)
    )
    result = await db.execute(stmt)
    return [row[0] for row in result]
