# Receipt Intelligence Service

A standalone FastAPI service that turns a photographed receipt into
structured, validated expense data:

`upload → OpenCV vision → multilingual OCR → Groq LLM extraction → Python validation`

It's called server-to-server by the main VacationBudget Next.js app (see
`lib/receipts/receipt-client.ts`), which authenticates the end user itself —
this service only checks a shared bearer secret (`SERVICE_AUTH_TOKEN`) and
never touches Supabase or any user data store.

## Running locally

```bash
cd receipt-service
cp .env.example .env   # fill in GROQ_API_KEY and SERVICE_AUTH_TOKEN
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Then in the main app's `.env.local`, set `RECEIPT_SERVICE_URL=http://localhost:8000`
and the same `RECEIPT_SERVICE_TOKEN` value.

## Tests and lint

```bash
uv run pytest
uv run ruff check .
```

### Receipt extraction eval

`eval/fixtures/` holds labelled receipts in English, Italian, German, French,
Arabic and Hebrew, including decimal commas, discounts, multiple VAT rates,
blurry OCR, missing subtotals, unusual dates and a prompt injection.

```bash
uv run python -m eval.run         # replay: recorded model output → parsing + validation
uv run python -m eval.run --live  # live: OCR text → the configured LLM (needs GROQ_API_KEY)
```

Replay is deterministic and gated in pytest (`tests/eval/`); live mode costs API
calls and measures the model itself, so it never runs in the normal suite.

### API contract

`contracts/receipt-analyze.schema.json` (repo root) is generated from the Pydantic
response models; the web app's tests check its Zod schema against it, so a field
changed on one side fails a test on that side. After an intentional change:

```bash
UPDATE_CONTRACT=1 uv run pytest tests/test_contract.py
```

## Architecture

| Module              | Responsibility                                              |
| ------------------- | ------------------------------------------------------------ |
| `app/upload`        | File type/content/size validation                            |
| `app/vision`        | OpenCV: crop, perspective-correct, deskew, denoise, threshold |
| `app/ocr`           | PaddleOCR (primary) + Tesseract (Hebrew / fallback)           |
| `app/llm`           | `LLMProvider` abstraction + `GroqProvider`, prompts, parsing  |
| `app/validation`    | Authoritative amount/currency/date normalization + reconciliation |
| `app/pipeline.py`   | Wires the stages above together                               |
| `app/api`           | The single `/v1/receipts/analyze` HTTP endpoint               |

Swapping LLM vendors means writing a new `LLMProvider`, not touching
`app/pipeline.py`, `app/validation`, or the API layer.
