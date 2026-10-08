import React from 'react';
import { CheckCircle2, Play, Quote, User, Clock } from 'lucide-react';

export default function KeyDecisions({ decisions = [], onSeek }) {
  const parseSec = (ts) => {
    if (!ts) return null;
    const parts = ts.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Key Agreed Decisions</h3>
            <p className="text-xs text-slate-400">
              Only includes items explicitly agreed upon; non-agreed proposals are strictly excluded
            </p>
          </div>
        </div>

        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
          {decisions.length} recorded
        </span>
      </div>

      {decisions.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-slate-400 text-sm">
          No explicit decisions were agreed upon during this meeting.
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((d, idx) => {
            const sec = parseSec(d.evidence?.timestamp);
            return (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 sm:p-5 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold mt-0.5">
                      ✓
                    </span>
                    <h4 className="text-sm sm:text-base font-semibold text-slate-100 leading-snug">
                      {d.decision}
                    </h4>
                  </div>
                </div>

                {/* Evidence Quote */}
                {d.evidence && (
                  <div className="ml-9 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <div className="flex items-start space-x-2 text-slate-400 italic">
                      <Quote className="w-3.5 h-3.5 flex-shrink-0 text-slate-500 mt-0.5" />
                      <span className="text-slate-300">"{d.evidence.quote}"</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <div className="flex items-center space-x-3">
                        {d.evidence.speaker && (
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{d.evidence.speaker}</span>
                          </span>
                        )}
                        {d.evidence.timestamp && (
                          <span className="flex items-center space-x-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{d.evidence.timestamp}</span>
                          </span>
                        )}
                      </div>

                      {sec !== null && onSeek && (
                        <button
                          onClick={() => onSeek(sec)}
                          className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                        >
                          <Play className="w-2.5 h-2.5" />
                          <span>Listen Evidence</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
