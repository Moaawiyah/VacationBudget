"""Field-by-field tolerance for LLM output.

A strict schema rejects the whole response if one field is off — so a single
price sent as "-2,00" instead of -2.0, or "line_items": null, would discard
the merchant, the total and every other item along with it. Models built on
LenientModel instead drop only what doesn't fit: an invalid field is removed,
an invalid list element is removed from its list, and the rest survives.
(Nothing is trusted either way — app.validation re-parses every value.)
"""

import typing
from functools import cache
from typing import Any

from pydantic import BaseModel, TypeAdapter, ValidationError, model_validator


@cache
def _adapter(annotation: Any) -> TypeAdapter[Any]:
    return TypeAdapter(annotation)


def _is_valid(annotation: Any, value: Any) -> bool:
    try:
        _adapter(annotation).validate_python(value)
        return True
    except ValidationError:
        return False


def _salvage(annotation: Any, value: Any) -> tuple[bool, Any]:
    """(keep?, value) — for list fields, the list minus its invalid elements."""
    if _is_valid(annotation, value):
        return True, value
    if typing.get_origin(annotation) is list and isinstance(value, list):
        (element,) = typing.get_args(annotation)
        return True, [item for item in value if _is_valid(element, item)]
    return False, None


class LenientModel(BaseModel):
    @model_validator(mode="before")
    @classmethod
    def _drop_invalid_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        kept: dict[str, Any] = {}
        for name, field in cls.model_fields.items():
            if name in data:
                keep, value = _salvage(field.annotation, data[name])
                if keep:
                    kept[name] = value
        return kept
