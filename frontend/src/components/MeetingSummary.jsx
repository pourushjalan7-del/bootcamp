import React, { useState } from 'react';
import { AlignLeft, ListOrdered, Copy, Check, Sparkles } from 'lucide-react';

export default function MeetingSummary({ summary = '', minutes = [] }) {
  const [copied, setCopied] = useState(false);

  const handleCopyMinutes = () => {
    const text = `## Executive Summary\n${summary}\n\n## Minutes\n` +
      minutes.map((m) => `- ${m}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">Executive Summary</h3>
          </div>
          <button
            onClick={handleCopyMinutes}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
          {summary || <span className="text-slate-500 italic">No summary generated.</span>}
        </p>
      </div>

      {/* Chronological Minutes */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-sm">
        <div className="flex items-center space-x-2.5 mb-5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ListOrdered className="w-4 h-4" />
          </div>
          <h3 className="text-base font-semibold text-slate-100">Chronological Minutes</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {minutes.length} points
          </span>
        </div>

        {minutes.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No meeting minutes recorded.</p>
        ) : (
          <ul className="space-y-3">
            {minutes.map((m, idx) => (
              <li
                key={idx}
                className="flex items-start space-x-3 text-sm text-slate-200 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-xs font-mono font-medium mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed flex-1">{m}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
