"""Stage 2: phonetic-RAG candidate retrieval + LLM 1 refinement + drift validator."""
import difflib
import os
import re
from typing import Callable, List, Optional, Tuple

import jellyfish

import llm_client
import prompts
from schemas import RawTranscript, RefinedTranscript, Turn

CHUNK = int(os.getenv("REFINE_CHUNK_TURNS", 15))
CONTEXT_TURNS = 2
MAX_EDIT_RATIO = float(os.getenv("MAX_EDIT_RATIO", 0.15))
MAX_CANDIDATES = 15

_NUMW = set("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen "
            "sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety "
            "hundred thousand million billion first second third half".split())
_NEG = {"not", "no", "never", "none", "nobody", "nothing", "neither", "nor", "without", "cannot", "cant", "dont", "wont"}
_NUM = re.compile(r"\d+(?:[.,:]\d+)*")


def load_glossary(path: Optional[str]) -> List[str]:
    if not path or not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return [l.strip() for l in f if l.strip() and not l.startswith("#")]


# ---------- phonetic retrieval ----------
def _key(s: str) -> str:
    s = re.sub(r"[^a-z0-9 ]", "", s.lower()).replace(" ", "")
    try:
        return jellyfish.metaphone(s) if s else ""
    except Exception:
        return ""


def build_index(terms: List[str]):
    return [(t, _key(t)) for t in terms if _key(t)]


def find_candidates(texts: List[str], index) -> List[Tuple[str, str]]:
    if not index:
        return []
    known = {t.lower() for t, _ in index}
    words = re.findall(r"[A-Za-z0-9']+", " ".join(texts))
    found = {}
    for n in (1, 2, 3):
        for i in range(len(words) - n + 1):
            heard = " ".join(words[i:i + n])
            if heard.lower() in known or any(w.lower() in known for w in words[i:i + n]):
                continue
            k = _key(heard)
            if len(k) < 4:
                continue
            for term, tk in index:
                if abs(len(k) - len(tk)) > 2 or k[0] != tk[0]:
                    continue
                if k == tk or difflib.SequenceMatcher(None, k, tk).ratio() >= 0.85:
                    found.setdefault(heard, term)
    return list(found.items())[:MAX_CANDIDATES]


# ---------- drift validator ----------
def _signature(text: str):
    toks = re.findall(r"[a-z']+", text.lower())
    return (sorted(_NUM.findall(text)),
            sorted(w for w in toks if w in _NUMW),
            sorted(w for w in toks if w in _NEG or w.endswith("n't")))


def validate_chunk(old: List[str], new: List[str]) -> Tuple[bool, str]:
    if len(old) != len(new):
        return False, "turn count changed"
    changed = total = 0
    for k, (o, n) in enumerate(zip(old, new)):
        if not n.strip():
            return False, f"turn {k} emptied"
        if _signature(o) != _signature(n):
            return False, f"numbers or negations changed in turn {k}"
        ow, nw = o.split(), n.split()
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, ow, nw).get_opcodes():
            if tag != "equal":
                changed += max(i2 - i1, j2 - j1)
        total += max(len(ow), 1)
    if changed / total > MAX_EDIT_RATIO:
        return False, f"edit ratio {changed/total:.0%} exceeds limit"
    return True, ""


# ---------- LLM refinement ----------
def _refine_chunk(chunk: List[Turn], context: List[str], index):
    old = [t.text for t in chunk]
    cands = find_candidates(old, index)
    model, reason = "", "unknown"
    for _ in range(2):                                   # one retry
        try:
            out, model = llm_client.chat("refiner", prompts.REFINER_SYSTEM,
                                         prompts.refiner_user(cands, context, chunk))
            items = {int(x["i"]): str(x["text"]) for x in llm_client.parse_json(out)["turns"]}
            new = [items[i] for i in range(len(chunk))]
            ok, reason = validate_chunk(old, new)
            if ok:
                return new, model, None
        except Exception as ex:
            reason = f"LLM error ({type(ex).__name__})"
    return old, model, reason                            # fall back to raw text


def run_stage2(raw: RawTranscript, glossary_terms: List[str],
               progress: Optional[Callable[[str], None]] = None) -> RefinedTranscript:
    index = build_index(glossary_terms)
    turns, out, flags, model = raw.turns, [], [], ""
    for s in range(0, len(turns), CHUNK):
        chunk = turns[s:s + CHUNK]
        ctx = [f"{t.speaker}: {t.text}" for t in turns[max(0, s - CONTEXT_TURNS):s]]
        if progress:
            progress(f"Refining turns {s+1}-{s+len(chunk)} of {len(turns)}...")
        new, m, reason = _refine_chunk(chunk, ctx, index)
        model = m or model
        if reason:
            flags.append(f"Refinement skipped for turns {s+1}-{s+len(chunk)} (kept raw): {reason}")
        out += [Turn(speaker=t.speaker, start=t.start, end=t.end, text=x) for t, x in zip(chunk, new)]
    return RefinedTranscript(turns=out, flags=flags, llm_model=model)
