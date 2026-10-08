"""FastAPI backend providing REST endpoints and serving the modern web frontend.

Run: uvicorn api:app --port 8000
"""
import json
import mimetypes
import os
import shutil
import tempfile
import threading
import uuid
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles

from orchestrator import run_pipeline
from stage2_refine import load_glossary
from utils import diff_turns_html, export_json, export_markdown

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
DEFAULT_GLOSSARY_PATH = os.path.join(os.path.dirname(__file__), "glossary.txt")
JOBS_STORAGE_DIR = os.path.join(tempfile.gettempdir(), "meeting_ai_jobs")
os.makedirs(JOBS_STORAGE_DIR, exist_ok=True)

app = FastAPI(
    title="Meeting Intelligence API",
    description="Multimodal Speech-to-Text, Domain Refinement, and Minutes Extraction Pipeline",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS: dict = {}
LOCK = threading.Lock()  # models are not thread-safe: one job at a time


def _work(job_id: str, apath: str, gpath: Optional[str]):
    job = JOBS[job_id]
    try:
        with LOCK:
            res = run_pipeline(apath, gpath, progress=job["progress"].append)

        diff_html = ""
        if res.raw and res.refined:
            try:
                diff_html = diff_turns_html(res.raw.turns, res.refined.turns)
            except Exception:
                diff_html = ""

        job["result"] = {
            "record": res.model_dump(),
            "markdown": export_markdown(res),
            "diff_html": diff_html,
            "errors": res.errors,
        }
        job["status"] = "error" if (res.errors and not res.raw) else "done"
    except Exception as ex:
        job["result"] = {"errors": [str(ex)]}
        job["status"] = "error"


@app.get("/health")
def health():
    return {"status": "ok", "app": "Meeting Intelligence API"}


@app.get("/glossary")
def get_glossary():
    terms = load_glossary(DEFAULT_GLOSSARY_PATH)
    return {"terms": terms}


@app.post("/jobs")
async def create_job(
    audio: UploadFile = File(...),
    glossary: Optional[UploadFile] = File(None),
    glossary_text: Optional[str] = Form(None),
):
    if not audio.filename:
        raise HTTPException(400, "No audio file provided.")

    job_id = uuid.uuid4().hex
    job_dir = os.path.join(JOBS_STORAGE_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    # Save audio
    ext = os.path.splitext(audio.filename)[1] or ".wav"
    apath = os.path.join(job_dir, f"audio{ext}")
    with open(apath, "wb") as f:
        content = await audio.read()
        if len(content) == 0:
            shutil.rmtree(job_dir, ignore_errors=True)
            raise HTTPException(400, "Uploaded audio file is empty (0 bytes).")
        f.write(content)

    # Handle glossary
    gpath = None
    if glossary and glossary.filename:
        gpath = os.path.join(job_dir, "glossary.txt")
        with open(gpath, "wb") as f:
            f.write(await glossary.read())
    elif glossary_text and glossary_text.strip():
        gpath = os.path.join(job_dir, "glossary.txt")
        with open(gpath, "w", encoding="utf-8") as f:
            f.write(glossary_text.strip())

    JOBS[job_id] = {
        "status": "running",
        "progress": [],
        "result": None,
        "audio_path": apath,
        "filename": audio.filename,
    }

    threading.Thread(target=_work, args=(job_id, apath, gpath), daemon=True).start()
    return {"job_id": job_id}


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Unknown job ID")
    return {
        "status": job["status"],
        "progress": job["progress"],
        "result": job["result"],
        "filename": job.get("filename"),
    }


@app.get("/jobs/{job_id}/audio")
def get_job_audio(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Unknown job ID")
    apath = job.get("audio_path")
    if not apath or not os.path.exists(apath):
        raise HTTPException(404, "Audio file not found")
    media_type, _ = mimetypes.guess_type(apath)
    return FileResponse(apath, media_type=media_type or "audio/wav")


@app.get("/jobs/{job_id}/download/json")
def download_json(job_id: str):
    job = JOBS.get(job_id)
    if not job or not job.get("result"):
        raise HTTPException(404, "Job result not available")
    rec = job["result"].get("record")
    if not rec:
        raise HTTPException(404, "Meeting record not available")
    return Response(
        content=json.dumps(rec, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="meeting_record.json"'},
    )


@app.get("/jobs/{job_id}/download/markdown")
def download_markdown(job_id: str):
    job = JOBS.get(job_id)
    if not job or not job.get("result"):
        raise HTTPException(404, "Job result not available")
    md = job["result"].get("markdown", "")
    return PlainTextResponse(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": 'attachment; filename="meeting_record.md"'},
    )


# Serve React SPA static files if built
if os.path.isdir(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Exclude API endpoints from SPA fallback
        if full_path.startswith(("jobs", "glossary", "health", "docs", "openapi.json", "redoc")):
            raise HTTPException(404, "Not Found")
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
