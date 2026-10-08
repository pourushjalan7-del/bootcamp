import React from 'react';
import { Mic, Wand2, FileText, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';

const STAGES = [
  {
    id: 1,
    title: 'Stage 1: Speech-to-Text & Diarization',
    model: 'faster-whisper (large-v3-turbo) + pyannote',
    icon: Mic,
    matchLogs: ['Validating', 'Preparing audio', 'Transcribing', 'Identifying speakers'],
  },
  {
    id: 2,
    title: 'Stage 2: Domain-Aware Refinement',
    model: 'Phonetic-RAG + LLM 1 (Groq / Llama 3.3)',
    icon: Wand2,
    matchLogs: ['Refining turns'],
  },
  {
    id: 3,
    title: 'Stage 3: Documentation & Verification',
    model: 'LLM 2 + Verbatim Quote Alignment',
    icon: FileText,
    matchLogs: ['Extracting', 'Merging', 'Verifying evidence'],
  },
];

export default function PipelineProgress({ progress = [], status = 'running' }) {
  const latestLog = progress.length > 0 ? progress[progress.length - 1] : 'Initializing pipeline...';

  // Determine stage active/completed
  const getStageStatus = (stageId) => {
    if (status === 'done') return 'completed';

    const latest = latestLog.toLowerCase();
    if (stageId === 1) {
      if (latest.includes('refining') || latest.includes('extracting') || latest.includes('verifying') || latest.includes('done')) {
        return 'completed';
      }
      return 'active';
    }
    if (stageId === 2) {
      if (latest.includes('extracting') || latest.includes('verifying') || latest.includes('done')) {
        return 'completed';
      }
      if (latest.includes('refining')) {
        return 'active';
      }
      return 'pending';
    }
    if (stageId === 3) {
      if (latest.includes('done')) return 'completed';
      if (latest.includes('extracting') || latest.includes('verifying')) return 'active';
      return 'pending';
    }
    return 'pending';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
            <span>Orchestrating Multimodal Pipeline</span>
            {status === 'running' && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Processing audio upload through distinct ASR, Refiner, and Extractor stages
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300">
          <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          <span>Processing...</span>
        </div>
      </div>

      {/* Stages visual grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STAGES.map((s) => {
          const stState = getStageStatus(s.id);
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                stState === 'completed'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : stState === 'active'
                  ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`p-2 rounded-lg ${
                      stState === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : stState === 'active'
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Stage {s.id}</span>
                </div>

                <div>
                  {stState === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {stState === 'active' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                </div>
              </div>

              <div className="mt-3">
                <h4 className="text-xs font-semibold text-slate-200">{s.title.split(': ')[1]}</h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{s.model}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Realtime progress log ticker */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 font-mono text-xs">
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800/60">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Live Pipeline Log:</span>
          </span>
          <span>{progress.length} events logged</span>
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1 text-slate-300">
          {progress.map((msg, idx) => (
            <div key={idx} className="flex items-center space-x-2 text-[11px]">
              <span className="text-indigo-400">›</span>
              <span>{msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
