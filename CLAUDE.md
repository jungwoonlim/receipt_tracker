# Receipt Tracker

영수증 비용 관리 앱 — FastAPI + React + Vite + Upstage OCR

## 프로젝트 구조

```
receipt_tracker/
├── api/               FastAPI 백엔드 (Vercel Python Serverless)
│   ├── index.py       앱 진입점
│   ├── database.py    SQLAlchemy async 엔진
│   ├── models/        ORM + Pydantic 스키마
│   ├── routers/       receipts (OCR+CRUD), analytics
│   ├── services/      ocr.py — Upstage API 래퍼
│   └── requirements.txt
├── frontend/          React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── api/       client.ts — API 호출 함수
│       ├── components/ NavBar, UploadZone, ReceiptCard, StatsChart
│       └── pages/     Upload, Dashboard, Detail
├── vercel.json        Vercel 라우팅 설정
└── .env.example       환경변수 템플릿
```

## 개발 명령어

### 백엔드 (터미널 1)
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r api/requirements.txt
copy .env.example .env   # UPSTAGE_API_KEY 입력
uvicorn api.index:app --reload --port 8000
```
API 문서: http://localhost:8000/docs

### 프론트엔드 (터미널 2)
```powershell
cd frontend
npm install
npm run dev
```
앱: http://localhost:5173

## Vercel 배포
```powershell
npm install -g vercel
vercel login
vercel env add UPSTAGE_API_KEY production
vercel env add DATABASE_URL production
vercel --prod
```

## 등록된 MCP 활용

이 프로젝트에서는 다음 MCP 서버들이 등록되어 있습니다. **Claude Code에서 작업 시 반드시 활용하세요.**

### github (`mcp__github__*`)
- PR 생성/리뷰: `mcp__github__create_pull_request`, `mcp__github__create_pull_request_review`
- 이슈 관리: `mcp__github__create_issue`, `mcp__github__list_issues`
- 코드 검색: `mcp__github__search_code`
- 파일 업로드: `mcp__github__push_files`

### context7 (`mcp__context7__*`)
라이브러리 공식 문서 조회 시 항상 사용하세요. **순서 중요:**
1. `mcp__context7__resolve-library-id` — 라이브러리 ID 조회
2. `mcp__context7__query-docs` — 문서 내용 조회

사용 예: FastAPI, SQLAlchemy, React, Vite, Tailwind CSS, Recharts, react-dropzone, httpx, pydantic

### playwright (`mcp__playwright__*`)
E2E 테스트 및 UI 검증:
- `mcp__playwright__browser_navigate` → `http://localhost:5173`
- `mcp__playwright__browser_take_screenshot` — 화면 캡처
- `mcp__playwright__browser_fill_form` — 폼 입력 테스트
- `mcp__playwright__browser_click` — 버튼 클릭 검증

## OCR API

### Upstage Information Extraction
엔드포인트: `POST https://api.upstage.ai/v1/information-extraction`

**Mode 1 — receipt-extraction (기본값, 영수증 전용):**
```python
# multipart/form-data
model=receipt-extraction, document=@file
```
응답: `{ fields: [{key, value, confidence}] }`

**Mode 2 — information-extract (커스텀 스키마):**
```python
# JSON body
model=information-extract, messages=[{role, content:[{type:image_url, url:base64}]}]
response_format.json_schema = { ... }
```
응답: `choices[0].message.content` (stringified JSON)

## 아키텍처 결정

- **2단계 OCR 플로우**: `POST /api/receipts/ocr` → 미리보기 → `POST /api/receipts/` 저장
- **items_json**: 품목을 JSON 텍스트로 단일 컬럼 저장 (무료 티어 최적화)
- **ocr_raw**: Upstage 원본 응답 보존 (재처리/디버깅 용도)
- **이미지 미저장**: 서버에 이미지 저장 안 함, OCR 결과만 보존 (비용 절감)
- **DB**: SQLite 로컬 / Supabase PostgreSQL 프로덕션 (DATABASE_URL으로 전환)
