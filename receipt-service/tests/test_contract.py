"""The response contract shared with the Next.js app.

contracts/receipt-analyze.schema.json (repo root) is generated from the
Pydantic models below; the web app's tests check its Zod schema against that
same file. So a field added or renamed on either side fails a test on that
side until the other agrees — instead of failing in production.

After an intentional change, regenerate it:
    UPDATE_CONTRACT=1 uv run pytest tests/test_contract.py
"""

import json
import os
from pathlib import Path

from pydantic import TypeAdapter

from app.api.schemas import AnalyzeReceiptResponse, ErrorResponse

CONTRACT = Path(__file__).resolve().parents[2] / "contracts" / "receipt-analyze.schema.json"


def current_contract() -> dict:
    return {
        "response": TypeAdapter(AnalyzeReceiptResponse).json_schema(),
        "error": TypeAdapter(ErrorResponse).json_schema(),
    }


def test_committed_contract_matches_the_models():
    generated = current_contract()
    if os.environ.get("UPDATE_CONTRACT"):
        CONTRACT.parent.mkdir(exist_ok=True)
        CONTRACT.write_text(json.dumps(generated, indent=2, ensure_ascii=False) + "\n")
    committed = json.loads(CONTRACT.read_text())
    assert committed == generated, (
        "The API response models changed. If intended, regenerate with "
        "UPDATE_CONTRACT=1 and update lib/validation/receipt.ts to match."
    )


def test_every_error_body_has_code_and_message():
    required = current_contract()["error"]["required"]
    assert set(required) == {"code", "message"}
