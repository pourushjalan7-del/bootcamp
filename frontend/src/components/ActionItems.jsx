import React, { useState } from 'react';
import { CheckSquare, User, Calendar, Quote, Play, Clock, Check, Copy } from 'lucide-react';

export default function ActionItems({ actionItems = [], onSeek }) {
  const [completedTasks, setCompletedTasks] = useState({});
  const [copied, setCopied] = useState(false);

  const toggleTask = (idx) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const parseSec = (ts) => {
    if (!ts) return null;
    const parts = ts.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  };

  const handleCopyTasks = () => {
    const text = actionItems
      .map(
        (a) =>
          `- [ ] ${a.task} (Owner: ${a.owner || 'unspecified'}, Deadline: ${a.deadline || 'unspecified'})`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Action Items &amp; Tasks</h3>
            <p className="text-xs text-slate-400">
              Owners &amp; deadlines are only set if explicitly stated; missing details are strictly marked as unspecified
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyTasks}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            {actionItems.length} tasks
          </span>
        </div>
      </div>

      {actionItems.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-slate-400 text-sm">
          No actionable tasks assigned in this meeting recording.
        </div>
      ) : (
        <div className="space-y-4">
          {actionItems.map((item, idx) => {
            const isDone = !!completedTasks[idx];
            const sec = parseSec(item.evidence?.timestamp);
            const ownerStated = item.owner && item.owner !== 'unspecified';
            const deadlineStated = item.deadline && item.deadline !== 'unspecified';

            return (
              <div
                key={idx}
                className={`bg-slate-950/60 border rounded-xl p-4 sm:p-5 transition-all space-y-3 ${
                  isDone
                    ? 'border-emerald-500/30 opacity-70 bg-emerald-950/10'
                    : 'border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggleTask(idx)}
                      className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
                    />
                    <div className="flex-1">
                      <h4
                        className={`text-sm sm:text-base font-medium leading-snug transition-colors ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {item.task}
                      </h4>
                    </div>
                  </div>

                  {/* Owner & Deadline Badges */}
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <span
                      className={`inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md border font-medium ${
                        ownerStated
                          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title={ownerStated ? `Assigned to ${item.owner}` : 'Owner not stated in recording'}
                    >
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{ownerStated ? item.owner : 'Owner: unspecified'}</span>
                    </span>

                    <span
                      className={`inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md border font-medium ${
                        deadlineStated
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title={deadlineStated ? `Due ${item.deadline}` : 'Deadline not stated in recording'}
                    >
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{deadlineStated ? item.deadline : 'Deadline: unspecified'}</span>
                    </span>
                  </div>
                </div>

                {/* Evidence Quote */}
                {item.evidence && (
                  <div className="ml-7 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <div className="flex items-start space-x-2 text-slate-400 italic">
                      <Quote className="w-3.5 h-3.5 flex-shrink-0 text-slate-500 mt-0.5" />
                      <span className="text-slate-300">"{item.evidence.quote}"</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <div className="flex items-center space-x-3">
                        {item.evidence.speaker && (
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{item.evidence.speaker}</span>
                          </span>
                        )}
                        {item.evidence.timestamp && (
                          <span className="flex items-center space-x-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{item.evidence.timestamp}</span>
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
