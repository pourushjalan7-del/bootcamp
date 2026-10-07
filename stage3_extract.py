"""Stage 3: structured extraction (LLM 2) + evidence verification + map-reduce."""
import difflib
import os
import re
from typing import Callable, List, Optional, Tuple

import llm_client
import prompts
from schemas import ActionItem, Decision, MeetingDocumentation, RefinedTranscript
from utils import fmt_time

SINGLE_PASS_MAX_CHARS = int(os.getenv("SINGLE_PASS_MAX_CHARS", 48000))
SEGMENT_CHARS = 24000
EVIDENCE_COVERAGE = 0.85
_STOP = {"the", "and", "for", "by", "end", "next", "this", "before", "till", "until", "of", "on", "at", "in"}


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s.lower())).strip()


def _clean_quote(q: str) -> str:
    q = re.sub(r"^\s*\[[^\]]*\]\s*", "", q)
    return re.sub(r"^\s*SPEAKER_\w+:\s*", "", q)


def _extract(text: str) -> Tuple[MeetingDocumentation, str]:
    last = None
    for _ in range(2):
        try:
            out, model = llm_client.chat("extractor", prompts.EXTRACTOR_SYSTEM, prompts.extractor_user(text))
            return MeetingDocumentation.model_validate(llm_client.parse_json(out)), model
        except llm_client.LLMError:
            raise
        except Exception as ex:
            last = ex
    raise ValueError(f"LLM 2 returned invalid output: {type(last).__name__}")


def _split(lines: List[str], limit: int) -> List[str]:
    segs, cur, size = [], [], 0
    for l in lines:
        if size + len(l) > limit and cur:
            segs.append("\n".join(cur))
            cur, size = [], 0
        cur.append(l)
        size += len(l) + 1
    if cur:
        segs.append("\n".join(cur))
    return segs


def _dedupe(items, key):
    kept = []
    for it in items:
        if all(difflib.SequenceMatcher(None, key(it).lower(), key(k).lower()).ratio() < 0.85 for k in kept):
            kept.append(it)
    return kept


def _merge(parts: List[MeetingDocumentation]) -> Tuple[MeetingDocumentation, str]:
    model = ""
    try:
        out, model = llm_client.chat("extractor", prompts.MERGE_SYSTEM,
                                     prompts.merge_user([p.summary for p in parts]))
        summary = llm_client.parse_json(out)["summary"]
    except Exception:
        summary = " ".join(p.summary for p in parts)
    return MeetingDocumentation(
        summary=summary,
        minutes=[m for p in parts for m in p.minutes],
        key_decisions=_dedupe([d for p in parts for d in p.key_decisions], lambda d: d.decision),
        action_items=_dedupe([a for p in parts for a in p.action_items], lambda a: a.task),
    ), model


# ---------- evidence verification ----------
def _locate(quote: str, turns_norm: List[str]) -> Optional[int]:
    q = _norm(_clean_quote(quote))
    if len(q) < 8:
        return None
    best, best_i = 0.0, None
    for i in range(len(turns_norm)):
        for span in (1, 2):
            window = " ".join(turns_norm[i:i + span])
            if q in window:
                return i
            sm = difflib.SequenceMatcher(None, window, q, autojunk=False)
            cov = sum(b.size for b in sm.get_matching_blocks()) / len(q)
            if cov > best:
                best, best_i = cov, i
    return best_i if best >= EVIDENCE_COVERAGE else None


def _verify(docs: MeetingDocumentation, refined: RefinedTranscript) -> Tuple[MeetingDocumentation, List[str]]:
    flags: List[str] = []
    turns_norm = [_norm(t.text) for t in refined.turns]
    vocab = set(" ".join(turns_norm).split())

    def attach(ev):
        i = _locate(ev.quote, turns_norm)
        if i is None:
            return False
        ev.speaker, ev.timestamp = refined.turns[i].speaker, fmt_time(refined.turns[i].start)
        return True

    decisions: List[Decision] = []
    for d in docs.key_decisions:
        if attach(d.evidence):
            decisions.append(d)
        else:
            flags.append(f"Dropped unverified decision: {d.decision[:80]}")

    actions: List[ActionItem] = []
    for a in docs.action_items:
        if not attach(a.evidence):
            flags.append(f"Dropped unverified action item: {a.task[:80]}")
            continue
        if a.owner and not any(w in vocab for w in _norm(a.owner).split() if len(w) > 2):
            flags.append(f"Cleared owner not found in transcript for: {a.task[:60]}")
            a.owner = None
        if a.deadline:
            sig = [w for w in _norm(a.deadline).split() if len(w) > 2 and w not in _STOP]
            if sig and not any(w in vocab for w in sig):
                flags.append(f"Cleared deadline not found in transcript for: {a.task[:60]}")
                a.deadline = None
        actions.append(a)

    return MeetingDocumentation(summary=docs.summary, minutes=docs.minutes,
                                key_decisions=decisions, action_items=actions), flags


def run_stage3(refined: RefinedTranscript,
               progress: Optional[Callable[[str], None]] = None):
    """Returns (MeetingDocumentation, flags, model)."""
    say = progress or (lambda m: None)
    lines = [f"[{fmt_time(t.start)}] {t.speaker}: {t.text}" for t in refined.turns]
    full = "\n".join(lines)
    if len(full) <= SINGLE_PASS_MAX_CHARS:
        say("Extracting minutes, decisions and action items...")
        docs, model = _extract(full)
    else:
        segs = _split(lines, SEGMENT_CHARS)
        parts, model = [], ""
        for k, seg in enumerate(segs, 1):
            say(f"Extracting from part {k}/{len(segs)}...")
            p, model = _extract(seg)
            parts.append(p)
        say("Merging parts...")
        docs, _ = _merge(parts)
    say("Verifying evidence...")
    docs, flags = _verify(docs, refined)
    return docs, flags, model
