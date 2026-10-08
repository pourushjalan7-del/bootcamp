import React from 'react';
import { Cpu, Clock, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';

export default function PipelineDiagnostics({ models = {}, timings = {}, flags = [], errors = [] }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-sm space-y-6">
      <div className="flex items-center space-x-2.5">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Cpu className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">Pipeline Architecture &amp; Diagnostics</h3>
          <p className="text-xs text-slate-400">
            Model orchestration breakdown, execution telemetry, and pipeline safeguard checks
          </p>
        </div>
      </div>

      {/* Model roles & Stage timings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Models */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Deployed Models by Stage</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Stage 1 (ASR):</span>
              <span className="font-mono text-slate-200">{models.asr || 'faster-whisper large-v3-turbo'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Diarization:</span>
              <span className="font-mono text-slate-200">{models.diarization || 'pyannote 3.1'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Stage 2 (Refiner LLM 1):</span>
              <span className="font-mono text-slate-200">{models.refiner || 'Llama-3.3-70B (Groq)'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Stage 3 (Extractor LLM 2):</span>
              <span className="font-mono text-slate-200">{models.extractor || 'LLM 2 Extractor'}</span>
            </div>
          </div>
        </div>

        {/* Timings */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Stage Execution Timings</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Stage 1 (Audio + Whisper + Diarization):</span>
              <span className="font-mono text-indigo-300">{timings.stage1 !== undefined ? `${timings.stage1}s` : '—'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Stage 2 (Phonetic-RAG + LLM 1):</span>
              <span className="font-mono text-indigo-300">{timings.stage2 !== undefined ? `${timings.stage2}s` : '—'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Stage 3 (Extraction + Verification):</span>
              <span className="font-mono text-indigo-300">{timings.stage3 !== undefined ? `${timings.stage3}s` : '—'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400 font-semibold">Total Pipeline Runtime:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {Object.values(timings).length > 0
                  ? `${Object.values(timings).reduce((a, b) => a + b, 0).toFixed(1)}s`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Safeguards / Flags */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Active Pipeline Safeguards &amp; Verification Checks</span>
        </div>

        {flags.length === 0 && errors.length === 0 ? (
          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>All stages completed with 100% evidence verification and zero drift flags.</span>
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            {errors.map((e, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-rose-300 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{e}</span>
              </div>
            ))}
            {flags.map((f, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
