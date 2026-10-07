"""Stage 1: VAD + ASR (faster-whisper) + diarization (pyannote) + alignment.

Public API:
    run_stage1(audio_path, glossary_terms=None, progress=None) -> RawTranscript
"""
import os
import subprocess
import tempfile
from typing import Callable, List, Optional

from schemas import RawTranscript, Turn

ASR_MODEL = os.getenv("ASR_MODEL", "large-v3-turbo")
DIARIZATION_MODEL = "pyannote/speaker-diarization-3.1"
PAUSE_SPLIT_SEC = 2.0          # split same-speaker turn on a long pause
MAX_PROMPT_TERMS = 80          # glossary terms fed to Whisper initial_prompt

_cache = {}


class Stage1Error(Exception):
    """User-presentable failure in Stage 1."""


def _notify(cb: Optional[Callable[[str], None]], msg: str):
    if cb:
        cb(msg)


# ---------- audio prep ----------
def _to_wav16k(path: str) -> str:
    """Convert to 16 kHz mono wav (needed by pyannote, safe for Whisper).
    Falls back to the original file if ffmpeg is unavailable."""
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", path, "-ac", "1", "-ar", "16000", out],
            check=True, capture_output=True,
        )
        return out
    except FileNotFoundError:
        return path
    except subprocess.CalledProcessError:
        raise Stage1Error("Audio could not be decoded; the file may be corrupted.")


# ---------- ASR ----------
def _get_whisper():
    if "whisper" not in _cache:
        from faster_whisper import WhisperModel
        try:
            import torch
            cuda = torch.cuda.is_available()
        except ImportError:
            cuda = False
        device, ctype = ("cuda", "float16") if cuda else ("cpu", "int8")
        _cache["whisper"] = WhisperModel(ASR_MODEL, device=device, compute_type=ctype)
    return _cache["whisper"]


def _transcribe(wav: str, glossary_terms: Optional[List[str]]):
    model = _get_whisper()
    prompt = None
    if glossary_terms:
        prompt = "Technical meeting. Terms: " + ", ".join(glossary_terms[:MAX_PROMPT_TERMS]) + "."
    segments, info = model.transcribe(
        wav,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,                       # Silero VAD
        vad_parameters={"min_silence_duration_ms": 500},
        initial_prompt=prompt,
        condition_on_previous_text=False,      # reduces hallucination loops
    )
    words = []
    for seg in segments:                       # generator: decoding happens here
        for w in (seg.words or []):
            if w.word.strip():
                words.append((w.start, w.end, w.word))
    return words, info


# ---------- diarization ----------
def _diarize(wav: str, hf_token: str):
    """Returns list of (start, end, speaker) or raises."""
    from pyannote.audio import Pipeline
    if "diar" not in _cache:
        try:
            pipe = Pipeline.from_pretrained(DIARIZATION_MODEL, token=hf_token)
        except TypeError:                      # older pyannote API
            pipe = Pipeline.from_pretrained(DIARIZATION_MODEL, use_auth_token=hf_token)
        try:
            import torch
            if torch.cuda.is_available():
                pipe.to(torch.device("cuda"))
        except ImportError:
            pass
        _cache["diar"] = pipe
    result = _cache["diar"](wav)
    # pyannote 4.x wraps output; 3.x returns the Annotation directly
    ann = getattr(result, "speaker_diarization", result)
    return [(t.start, t.end, spk) for t, _, spk in ann.itertracks(yield_label=True)]


# ---------- alignment ----------
def _speaker_for(start: float, end: float, segs) -> str:
    best, best_ov = None, 0.0
    for s, e, spk in segs:
        ov = min(end, e) - max(start, s)
        if ov > best_ov:
            best, best_ov = spk, ov
    if best:
        return best
    mid = (start + end) / 2                    # no overlap: nearest segment
    return min(segs, key=lambda x: min(abs(mid - x[0]), abs(mid - x[1])))[2]


def _build_turns(words, segs) -> List[Turn]:
    turns: List[Turn] = []
    cur = None
    for start, end, text in words:
        spk = _speaker_for(start, end, segs) if segs else "UNKNOWN"
        new_turn = (
            cur is None
            or spk != cur["speaker"]
            or start - cur["end"] > PAUSE_SPLIT_SEC
        )
        if new_turn:
            if cur:
                turns.append(Turn(**{**cur, "text": cur["text"].strip()}))
            cur = {"speaker": spk, "start": start, "end": end, "text": text}
        else:
            cur["text"] += text
            cur["end"] = end
    if cur:
        turns.append(Turn(**{**cur, "text": cur["text"].strip()}))
    return turns


# ---------- public ----------
def run_stage1(
    audio_path: str,
    glossary_terms: Optional[List[str]] = None,
    progress: Optional[Callable[[str], None]] = None,
) -> RawTranscript:
    warnings: List[str] = []
    _notify(progress, "Preparing audio...")
    wav = _to_wav16k(audio_path)

    try:
        _notify(progress, "Transcribing with VAD + Whisper...")
        words, info = _transcribe(wav, glossary_terms)
        if not words:
            raise Stage1Error("No speech detected in the audio.")

        segs, diarized = [], False
        token = os.getenv("HF_TOKEN")
        if not token:
            warnings.append("HF_TOKEN not set: speaker diarization skipped.")
        else:
            _notify(progress, "Identifying speakers...")
            try:
                segs = _diarize(wav, token)
                diarized = bool(segs)
            except Exception as ex:             # never let diarization kill the run
                warnings.append(f"Diarization failed ({type(ex).__name__}); continuing without speakers.")

        turns = _build_turns(words, segs)
        return RawTranscript(
            turns=turns,
            language=info.language,
            duration=float(info.duration),
            diarized=diarized,
            asr_model=ASR_MODEL,
            warnings=warnings,
        )
    finally:
        if wav != audio_path and os.path.exists(wav):
            os.remove(wav)


if __name__ == "__main__":
    import sys
    t = run_stage1(sys.argv[1], progress=print)
    print(t.as_text())
    print("\nWarnings:", t.warnings)
