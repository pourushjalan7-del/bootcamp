"""REST backend so any website can use the pipeline. Run: uvicorn api:app --port 8000

POST /jobs            (multipart: audio, optional glossary) -> {"job_id": ...}
GET  /jobs/{job_id}   -> {"status": running|done|error, "progress": [...], "result": {...}}
"""
import os
import shutil
import tempfile
import threading
import uuid
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from orchestrator import run_pipeline
from utils import export_markdown

app = FastAPI(title="Meeting Intelligence API")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])
JOBS: dict = {}
LOCK = threading.Lock()          # models are not thread-safe: one job at a time


def _work(job_id: str, apath: str, gpath: Optional[str], tmp: str):
    job = JOBS[job_id]
    try:
        with LOCK:
            res = run_pipeline(apath, gpath, progress=job["progress"].append)
        job["result"] = {"record": res.model_dump(), "markdown": export_markdown(res)}
        job["status"] = "error" if (res.errors and not res.raw) else "done"
    except Exception as ex:
        job["result"] = {"errors": [str(ex)]}
        job["status"] = "error"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@app.post("/jobs")
async def create_job(audio: UploadFile = File(...), glossary: Optional[UploadFile] = File(None)):
    tmp = tempfile.mkdtemp()
    apath = os.path.join(tmp, os.path.basename(audio.filename or "audio.wav"))
    with open(apath, "wb") as f:
        f.write(await audio.read())
    gpath = None
    if glossary:
        gpath = os.path.join(tmp, "glossary.txt")
        with open(gpath, "wb") as f:
            f.write(await glossary.read())
    job_id = uuid.uuid4().hex
    JOBS[job_id] = {"status": "running", "progress": [], "result": None}
    threading.Thread(target=_work, args=(job_id, apath, gpath, tmp), daemon=True).start()
    return {"job_id": job_id}


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Unknown job")
    return job
