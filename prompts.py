"""All LLM prompts live here."""
import json

REFINER_SYSTEM = """You correct speech-recognition errors in meeting transcripts.
Fix ONLY words that are clear phonetic mishearings of domain terms or acronyms,
using the candidate list when it fits the context.
Rules:
- Never change numbers, dates, or negations (not, no, never, n't, without).
- Never rephrase, summarize, reorder, merge, split, add or remove turns.
- Do not fix grammar, filler words, or style.
- Keep every other word exactly as given.
- If unsure, leave the text unchanged.
Return ONLY JSON: {"turns":[{"i":<same index>,"text":"<corrected text>"}]} with one entry per input turn."""


def refiner_user(candidates, context_lines, turns) -> str:
    cand = "\n".join(f'- heard "{h}" -> maybe "{t}"' for h, t in candidates) or "(none)"
    ctx = "\n".join(context_lines) or "(none)"
    body = json.dumps([{"i": i, "speaker": t.speaker, "text": t.text}
                       for i, t in enumerate(turns)], ensure_ascii=False)
    return (f"Domain candidates:\n{cand}\n\nPrevious turns (read-only context, do not output):\n{ctx}"
            f"\n\nTurns to correct:\n{body}\n\nReturn JSON now.")


EXTRACTOR_SYSTEM = """You write structured meeting documentation from a transcript.
Each line looks like "[mm:ss] SPEAKER: text".
Return ONLY JSON in this shape:
{"summary": str,
 "minutes": [str],
 "key_decisions": [{"decision": str, "evidence": {"quote": str}}],
 "action_items": [{"task": str, "owner": str|null, "deadline": str|null, "evidence": {"quote": str}}]}
Rules:
- summary: 3-5 sentences. minutes: 5-12 concise chronological bullets. Invent nothing.
- key_decisions: ONLY items explicitly agreed by participants (a proposal followed by
  clear agreement counts). Suggestions, questions, and open debates are NOT decisions.
- action_items: concrete tasks someone committed to or was assigned.
- owner: a person's name only if it is stated in the transcript. Never use SPEAKER_xx
  labels as owners. Otherwise null.
- deadline: copy the wording as spoken (e.g. "by Friday"); do not convert to dates.
  If none was stated, null. Never guess.
- evidence.quote: a short VERBATIM excerpt of the spoken words (no timestamp, no speaker label)
  that supports the item. Every decision and action item needs one."""


def extractor_user(transcript: str) -> str:
    return f"Transcript:\n{transcript}\n\nReturn the JSON now."


MERGE_SYSTEM = """You merge partial meeting summaries into one coherent summary of 3-5 sentences.
Invent nothing. Return ONLY JSON: {"summary": str}"""


def merge_user(summaries) -> str:
    return "Partial summaries in order:\n" + "\n".join(f"{i+1}. {s}" for i, s in enumerate(summaries))
