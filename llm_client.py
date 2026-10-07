"""One chat() entry point over Groq (OpenAI-compatible API). Used by stages 2 and 3."""
import json
import os
import re
from typing import List, Tuple

from openai import OpenAI

BASE_URL = "https://api.groq.com/openai/v1"
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


class LLMError(Exception):
    pass


def chat(role: str, system: str, user: str, temperature: float = 0.0) -> Tuple[str, str]:
    """Returns (json_text, 'groq/model'). `role` is kept for API compatibility."""
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise LLMError("GROQ_API_KEY is not set")
    model = os.getenv("GROQ_MODEL", MODEL)
    try:
        client = OpenAI(base_url=BASE_URL, api_key=key, timeout=120)
        r = client.chat.completions.create(
            model=model, temperature=temperature,
            response_format={"type": "json_object"},
            messages=[{"role": "system", "content": system},
                      {"role": "user", "content": user}],
        )
        return r.choices[0].message.content or "", f"groq/{model}"
    except Exception as ex:
        raise LLMError(f"Groq call failed: {type(ex).__name__}: {ex}")


def parse_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    a, b = text.find("{"), text.rfind("}")
    return json.loads(text[a:b + 1])
    