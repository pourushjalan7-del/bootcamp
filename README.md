# Meeting Intelligence Assistant

An AI-powered meeting assistant built for the **Inter IIT Bootcamp Phase 2 (ML PS)**. It converts recorded meeting audio into an accurate, domain-refined transcript and generates structured meeting minutes, key decisions, and actionable tasks through a coordinated multimodal pipeline.

---

## 🚀 Key Features & UI Capabilities

- **Interactive Web Interface**: Built with **React + Tailwind CSS** and served directly by **FastAPI** on `http://localhost:8000`.
- **Integrated Audio Player with Timestamp Seeking**: Click any turn timestamp (`[mm:ss]`), decision evidence, or task quote to jump playback directly to that moment.
- **Side-by-Side & Visual Diff Comparison**: Compare Raw ASR vs Refined transcripts side-by-side or with word-level highlight diffs (red for mishearings, green for domain term corrections).
- **Domain Glossary Manager**: Add custom acronyms and terms directly in the UI or upload `.txt` glossaries to boost Whisper and Phonetic-RAG precision.
- **Strict Evidence Verification**: Every agreed decision and action item is verified against verbatim transcript evidence. Proposals are never confused with agreed decisions.
- **Unspecified Detail Handling**: Where a task owner or deadline was not stated, it is explicitly preserved as `unspecified` rather than guessed.
- **Standardized Downloads**: One-click download of machine-readable `meeting_record.json` and human-readable `meeting_record.md`.
- **Diagnostics Panel**: Telemetry covering model names, execution timings per stage, and safeguard flags.

---

## 🧠 Multimodal Architecture & Models

| Stage | Model / Component | Role & Purpose |
|---|---|---|
| **Stage 1: ASR & Diarization** | `faster-whisper` (`large-v3-turbo`) + Silero VAD + `pyannote/speaker-diarization-3.1` | Transcribes spoken audio to turn-level raw transcript with speaker IDs and timestamps. |
| **Stage 2: Domain Refinement** | Phonetic-RAG (Double Metaphone) + Llama-3.3-70B via Groq | Corrects domain-specific terminology errors while strictly preserving numbers, negations, and speaker meaning. |
| **Stage 3: Documentation & Verification** | Structured Extraction LLM (Groq / OpenAI) + Verbatim Quote Alignment | Generates executive summary, organized minutes, verified decisions, and actionable tasks. |

---

## 🛠️ Quickstart

### 1. Prerequisites
- **Python 3.10+**
- **ffmpeg** (`brew install ffmpeg` on macOS or `sudo apt install ffmpeg` on Linux)
- **Node.js 18+** (already pre-built into `static/`; only needed if modifying frontend)

### 2. Python Environment & Dependencies
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Environment Variables
Create `.env` from `.env.example`:
```bash
cp .env.example .env
```
Fill in your API keys in `.env`:
```env
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
HF_TOKEN=your_huggingface_token_optional_for_diarization
```

---

## 💻 Running the Application

### Option A: Complete Web App & API (Recommended)
Run the FastAPI backend (serves both the REST API and the React frontend):
```bash
uvicorn api:app --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

### Option B: Frontend Development Mode
If you want to edit the React frontend with hot module replacement (HMR):
```bash
# Terminal 1: Backend
uvicorn api:app --port 8000

# Terminal 2: Frontend Dev Server
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### Option C: CLI Mode
Process an audio file directly from the terminal:
```bash
python orchestrator.py meeting.wav
```
Outputs will be saved to `./outputs/meeting_record.json` and `./outputs/meeting_record.md`.

### Option D: Streamlit UI
```bash
streamlit run app.py
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/jobs` | Upload audio (`multipart/form-data`) and optional glossary file/text to start pipeline. |
| `GET` | `/jobs/{job_id}` | Poll job status (`running`, `done`, `error`), live progress logs, and results. |
| `GET` | `/jobs/{job_id}/audio` | Stream uploaded audio file for synchronized frontend playback. |
| `GET` | `/jobs/{job_id}/download/json` | Download machine-readable `meeting_record.json`. |
| `GET` | `/jobs/{job_id}/download/markdown` | Download human-readable `meeting_record.md`. |
| `GET` | `/glossary` | Get loaded domain terminology terms. |
| `GET` | `/health` | Health check probe. |

---

## 🛡️ Safeguards & Verification

1. **Audio Validation**: Rejects corrupted, empty (0 bytes), or non-audio formats with clear descriptive messages.
2. **Drift Validator**: Enforces strict invariants on Stage 2 LLM output — turns cannot be deleted, and numbers, dates, and negations are strictly locked.
3. **Verbatim Evidence Verification**: Every key decision and action item must cite a verbatim quote found in the transcript; unverified items are automatically dropped.
4. **Unspecified Details**: Missing owners or deadlines are marked as `unspecified` rather than guessed by the model.
