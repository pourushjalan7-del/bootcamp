# Meeting Intelligence Assistant

Audio -> raw transcript -> domain-refined transcript -> summary, minutes, decisions, action items.

## Models
| Stage | Model |
|---|---|
| 1 ASR | faster-whisper `large-v3-turbo` + Silero VAD |
| 1 Diarization | pyannote `speaker-diarization-3.1` (optional, needs HF_TOKEN) |
| 2 Refiner (LLM 1) | Llama-3.3-70B via Groq (fallback: OpenAI, Ollama) |
| 3 Extractor (LLM 2) | gpt-4o-mini via OpenAI (fallback: Groq, Ollama) |

## Setup
1. Install ffmpeg (`sudo apt install ffmpeg`), Python 3.10+.
2. `pip install -r requirements.txt`
3. `cp .env.example .env`, fill keys, then `export $(grep -v '^#' .env | cut -d'#' -f1 | xargs)`
4. UI: `streamlit run app.py` | CLI: `python orchestrator.py meeting.wav` | API: `uvicorn api:app --port 8000`

## Safeguards
- Drift validator: numbers, negations, turn count and edit ratio checked per chunk; failures fall back to raw text.
- Every decision/action must carry a verbatim evidence quote that is verified against the transcript.
- Owner/deadline are null unless present in the transcript.
- Empty/corrupt/unsupported audio gives a clear error; later-stage failures still return earlier results.

## Outputs
`meeting_record.json` (machine-readable) and `meeting_record.md` (human-readable), same content.
