from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()                               # .env
load_dotenv(".env.local", override=True)    # .env.local 우선 적용

from api.database import init_db
from api.routers import analytics, receipts


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:
        print(f"[startup] init_db failed: {e}")
    yield


app = FastAPI(
    title="Receipt Tracker API",
    description="영수증 비용 관리 API — Upstage Information Extraction 기반 OCR",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(receipts.router, prefix="/api/receipts", tags=["receipts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok"}
