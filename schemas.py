"""Shared data contracts for all stages."""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class Turn(BaseModel):
    speaker: str                 # "SPEAKER_01" or "UNKNOWN"
    start: float
    end: float
    text: str


class RawTranscript(BaseModel):
    turns: List[Turn]
    language: str = "en"
    duration: float = 0.0
    diarized: bool = False
    asr_model: str = ""
    warnings: List[str] = Field(default_factory=list)

    def as_text(self) -> str:
        return "\n".join(f"[{t.speaker}] {t.text}" for t in self.turns)


class RefinedTranscript(BaseModel):
    turns: List[Turn]
    flags: List[str] = Field(default_factory=list)
    llm_model: str = ""

    def as_text(self) -> str:
        return "\n".join(f"[{t.speaker}] {t.text}" for t in self.turns)


class Evidence(BaseModel):
    quote: str
    speaker: Optional[str] = None
    timestamp: Optional[str] = None


class Decision(BaseModel):
    decision: str
    evidence: Evidence


class ActionItem(BaseModel):
    task: str
    owner: Optional[str] = None       # only if explicitly stated
    deadline: Optional[str] = None    # only if explicitly stated
    evidence: Evidence


class MeetingDocumentation(BaseModel):
    summary: str = ""
    minutes: List[str] = Field(default_factory=list)
    key_decisions: List[Decision] = Field(default_factory=list)
    action_items: List[ActionItem] = Field(default_factory=list)


class PipelineResult(BaseModel):
    raw: Optional[RawTranscript] = None
    refined: Optional[RefinedTranscript] = None
    docs: Optional[MeetingDocumentation] = None
    flags: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    models: Dict[str, str] = Field(default_factory=dict)
    timings: Dict[str, float] = Field(default_factory=dict)
