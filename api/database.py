import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

_raw_url = os.getenv("DATABASE_URL") or "sqlite+aiosqlite:////tmp/receipts.db"

# postgres:// or postgresql:// → postgresql+psycopg:// (psycopg3 async driver)
# psycopg3 handles sslmode=require natively in the DSN
if _raw_url.startswith("postgres://"):
    _raw_url = _raw_url.replace("postgres://", "postgresql+psycopg://", 1)
elif _raw_url.startswith("postgresql://"):
    _raw_url = _raw_url.replace("postgresql://", "postgresql+psycopg://", 1)

DATABASE_URL = _raw_url

_connect_args: dict = {}
if "sqlite" in DATABASE_URL:
    _connect_args = {"check_same_thread": False}

# NullPool: serverless에서 요청마다 새 연결 생성·종료
_pool_kwargs = {} if "sqlite" in DATABASE_URL else {"poolclass": NullPool}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=_connect_args, **_pool_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(AsyncAttrs, DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    from api.models import receipt  # noqa: F401 — ensures models are registered
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
