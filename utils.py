"""Audio validation, time formatting, diff rendering, exports."""
import difflib
import html
import os
import subprocess
from typing import List, Optional

from schemas import PipelineResult, Turn

EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg"}
MIN_SEC = 1.0
MAX_SEC = float(os.getenv("MAX_AUDIO_MINUTES", 180)) * 60


class AudioValidationError(Exception):
    pass


def fmt_time(sec: float) -> str:
    sec = int(sec)
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    return f"{h:d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def _signature_ok(h: bytes) -> bool:
    return ((h[:4] == b"RIFF" and h[8:12] == b"WAVE") or h[:3] == b"ID3"
            or (len(h) > 1 and h[0] == 0xFF and (h[1] & 0xE0) == 0xE0)
            or h[:4] == b"fLaC" or h[:4] == b"OggS" or h[4:8] == b"ftyp")


def validate_audio(path: str) -> Optional[float]:
    """Raises AudioValidationError with a UI-friendly message. Returns duration if known."""
    if not path or not os.path.exists(path):
        raise AudioValidationError("No audio file was provided.")
    if os.path.splitext(path)[1].lower() not in EXTS:
        raise AudioValidationError(f"Unsupported format. Use one of: {', '.join(sorted(EXTS))}.")
    if os.path.getsize(path) == 0:
        raise AudioValidationError("The audio file is empty.")
    with open(path, "rb") as f:
        if not _signature_ok(f.read(16)):
            raise AudioValidationError("The file is not valid audio (unrecognized header); it may be corrupted.")
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, check=True)
        dur = float(out.stdout.strip())
    except FileNotFoundError:
        return None                      # ffprobe unavailable: skip duration check
    except (subprocess.CalledProcessError, ValueError):
        raise AudioValidationError("The audio could not be decoded; the file may be corrupted.")
    if dur < MIN_SEC:
        raise AudioValidationError("The audio is too short to contain speech.")
    if dur > MAX_SEC:
        raise AudioValidationError(f"The audio is longer than the {int(MAX_SEC/60)}-minute limit.")
    return dur


def _word_diff(a: str, b: str) -> str:
    aw, bw = a.split(), b.split()
    out = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, aw, bw).get_opcodes():
        old, new = html.escape(" ".join(aw[i1:i2])), html.escape(" ".join(bw[j1:j2]))
        if tag == "equal":
            out.append(old)
        else:
            if old:
                out.append(f"<del style='background:#fdd'>{old}</del>")
            if new:
                out.append(f"<ins style='background:#cfc;text-decoration:none'>{new}</ins>")
    return " ".join(out)


def diff_turns_html(raw: List[Turn], refined: List[Turn]) -> str:
    rows = []
    for r, n in zip(raw, refined):
        rows.append(f"<p><b>[{fmt_time(r.start)}] {html.escape(r.speaker)}:</b> {_word_diff(r.text, n.text)}</p>")
    return "\n".join(rows)


def export_json(r: PipelineResult) -> str:
    return r.model_dump_json(indent=2)


def export_markdown(r: PipelineResult) -> str:
    L = ["# Meeting Record", ""]
    if r.docs:
        d = r.docs
        L += ["## Executive Summary", d.summary, "", "## Minutes"] + [f"- {m}" for m in d.minutes]
        L += ["", "## Key Decisions"]
        L += [f"- {x.decision}  \n  _\"{x.evidence.quote}\"_ ({x.evidence.speaker or '?'} @ {x.evidence.timestamp or '?'})"
              for x in d.key_decisions] or ["- None identified"]
        L += ["", "## Action Items"]
        L += [f"- [ ] {a.task} — Owner: {a.owner or 'unspecified'} | Deadline: {a.deadline or 'unspecified'}"
              for a in d.action_items] or ["- None identified"]
    if r.refined:
        L += ["", "## Refined Transcript"] + [f"**[{fmt_time(t.start)}] {t.speaker}:** {t.text}" for t in r.refined.turns]
    if r.raw:
        L += ["", "## Raw Transcript"] + [f"**[{fmt_time(t.start)}] {t.speaker}:** {t.text}" for t in r.raw.turns]
    L += ["", "## Processing Notes"] + [f"- Model ({k}): {v}" for k, v in r.models.items()]
    L += [f"- {x}" for x in r.flags + r.errors]
    return "\n".join(L)
