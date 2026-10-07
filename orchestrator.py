"""Runs validation -> stage 1 -> stage 2 -> stage 3. Returns partial results on failure."""
import os
import sys
import time
from typing import Callable, Optional

import stage1_asr
import stage2_refine
import stage3_extract
from schemas import PipelineResult, RefinedTranscript
from utils import AudioValidationError, export_json, export_markdown, validate_audio

DEFAULT_GLOSSARY = os.path.join(os.path.dirname(__file__), "glossary.txt")


def run_pipeline(audio_path: str, glossary_path: Optional[str] = None,
                 progress: Optional[Callable[[str], None]] = None) -> PipelineResult:
    say = progress or (lambda m: None)
    res = PipelineResult()
    terms = stage2_refine.load_glossary(glossary_path or DEFAULT_GLOSSARY)

    say("Validating audio...")
    try:
        validate_audio(audio_path)
    except AudioValidationError as ex:
        res.errors.append(str(ex))
        return res

    t0 = time.perf_counter()
    try:
        res.raw = stage1_asr.run_stage1(audio_path, terms, say)
    except Exception as ex:
        res.errors.append(f"Transcription failed: {ex}")
        return res
    res.timings["stage1"] = round(time.perf_counter() - t0, 1)
    res.models["asr"] = res.raw.asr_model
    res.models["diarization"] = stage1_asr.DIARIZATION_MODEL if res.raw.diarized else "not used"
    res.flags += res.raw.warnings

    t0 = time.perf_counter()
    try:
        res.refined = stage2_refine.run_stage2(res.raw, terms, say)
        res.models["refiner"] = res.refined.llm_model or "not run"
        res.flags += res.refined.flags
    except Exception as ex:
        res.errors.append(f"Refinement failed, using raw transcript: {ex}")
        res.refined = RefinedTranscript(turns=res.raw.turns, flags=["Refinement unavailable"])
    res.timings["stage2"] = round(time.perf_counter() - t0, 1)

    t0 = time.perf_counter()
    try:
        res.docs, flags, model = stage3_extract.run_stage3(res.refined, say)
        res.models["extractor"] = model
        res.flags += flags
    except Exception as ex:
        res.errors.append(f"Documentation generation failed: {ex}")
    res.timings["stage3"] = round(time.perf_counter() - t0, 1)
    say("Done.")
    return res


def save_outputs(res: PipelineResult, out_dir: str = "outputs"):
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "meeting_record.json"), "w", encoding="utf-8") as f:
        f.write(export_json(res))
    with open(os.path.join(out_dir, "meeting_record.md"), "w", encoding="utf-8") as f:
        f.write(export_markdown(res))


if __name__ == "__main__":
    r = run_pipeline(sys.argv[1], progress=print)
    save_outputs(r)
    print("Errors:", r.errors, "\nFlags:", r.flags, "\nSaved to ./outputs")
