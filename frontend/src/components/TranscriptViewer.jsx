import React, { useState } from 'react';
import { Search, SplitSquareVertical, Sparkles, FileText, Check, Copy, Play } from 'lucide-react';

function fmtTime(sec) {
  if (isNaN(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

const SPEAKER_COLORS = [
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
];

function getSpeakerColor(speaker) {
  if (!speaker || speaker === 'UNKNOWN') return 'bg-slate-800 text-slate-400 border-slate-700';
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SPEAKER_COLORS[Math.abs(hash) % SPEAKER_COLORS.length];
}

export default function TranscriptViewer({
  rawTurns = [],
  refinedTurns = [],
  diffHtml = '',
  onSeek,
  currentSec = 0,
}) {
  const [viewMode, setViewMode] = useState('diff'); // 'diff' | 'refined' | 'raw' | 'sideBySide'
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const turnsToDisplay = viewMode === 'raw' ? rawTurns : refinedTurns;

  const filteredTurns = turnsToDisplay.map((turn, index) => {
    const rawTurn = rawTurns[index] || turn;
    const refinedTurn = refinedTurns[index] || turn;
    return { index, turn, rawTurn, refinedTurn };
  }).filter(({ rawTurn, refinedTurn }) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rawTurn.text.toLowerCase().includes(q) ||
      refinedTurn.text.toLowerCase().includes(q) ||
      rawTurn.speaker.toLowerCase().includes(q)
    );
  });

  const handleCopyTranscript = () => {
    const text = turnsToDisplay
      .map((t) => `[${fmtTime(t.start)}] ${t.speaker}: ${t.text}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top control toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950/40">
        {/* Mode Selector Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setViewMode('diff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              viewMode === 'diff'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Refined (Visual Diff)</span>
          </button>

          <button
            onClick={() => setViewMode('sideBySide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              viewMode === 'sideBySide'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>

          <button
            onClick={() => setViewMode('refined')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              viewMode === 'refined'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Refined Only</span>
          </button>

          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              viewMode === 'raw'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw Only</span>
          </button>
        </div>

        {/* Search & Copy Actions */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search transcript turns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleCopyTranscript}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center space-x-1 text-xs px-2.5"
            title="Copy current transcript"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Diff Mode Note */}
      {viewMode === 'diff' && (
        <div className="px-5 py-2 bg-indigo-500/10 border-b border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Phonetic Refinement Diff:</span>
            <span>
              <del className="bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded mr-1">Red = ASR mishearing</del>
              <ins className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded no-underline font-medium">Green = Domain term correction</ins>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">Preserves names, negations, and numbers strictly</span>
        </div>
      )}

      {/* Main Turns List */}
      <div className="p-4 sm:p-6 max-h-[560px] overflow-y-auto space-y-4">
        {filteredTurns.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No transcript turns matching your search filter.
          </div>
        ) : viewMode === 'sideBySide' ? (
          <div className="space-y-4">
            {filteredTurns.map(({ index, rawTurn, refinedTurn }) => {
              const isCurrent = currentSec >= rawTurn.start && currentSec <= rawTurn.end;
              return (
                <div
                  key={index}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/30'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getSpeakerColor(rawTurn.speaker)}`}>
                        {rawTurn.speaker}
                      </span>
                      <button
                        onClick={() => onSeek && onSeek(rawTurn.start)}
                        className="text-[11px] font-mono text-slate-400 hover:text-indigo-400 flex items-center space-x-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 transition-colors"
                        title="Seek audio to this turn"
                      >
                        <Play className="w-2.5 h-2.5" />
                        <span>[{fmtTime(rawTurn.start)}]</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/60">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Raw ASR:</div>
                      <p className="text-slate-300 leading-relaxed">{rawTurn.text}</p>
                    </div>
                    <div className="p-2.5 bg-indigo-950/20 rounded-lg border border-indigo-900/30">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Refined:</div>
                      <p className="text-slate-200 leading-relaxed">{refinedTurn.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTurns.map(({ index, turn, rawTurn, refinedTurn }) => {
              const isCurrent = currentSec >= turn.start && currentSec <= turn.end;
              return (
                <div
                  key={index}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                      : 'bg-slate-950/40 border-slate-800/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 mb-1.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getSpeakerColor(turn.speaker)}`}>
                      {turn.speaker}
                    </span>
                    <button
                      onClick={() => onSeek && onSeek(turn.start)}
                      className="text-[11px] font-mono text-slate-400 hover:text-indigo-400 flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 transition-colors"
                      title="Seek audio to this turn"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>[{fmtTime(turn.start)}]</span>
                    </button>
                  </div>

                  {viewMode === 'diff' ? (
                    <div
                      className="diff-container text-xs sm:text-sm text-slate-200 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: rawTurn.text === refinedTurn.text
                          ? refinedTurn.text
                          : computeInlineDiff(rawTurn.text, refinedTurn.text),
                      }}
                    />
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{turn.text}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Client-side quick word-level diff fallback
function computeInlineDiff(oldText, newText) {
  const oldWords = oldText.split(/\s+/);
  const newWords = newText.split(/\s+/);
  // Simple word matching
  let out = [];
  let i = 0, j = 0;
  while (i < oldWords.length || j < newWords.length) {
    if (i < oldWords.length && j < newWords.length && oldWords[i].toLowerCase() === newWords[j].toLowerCase()) {
      out.push(newWords[j]);
      i++;
      j++;
    } else {
      if (i < oldWords.length && (!newWords[j] || !oldWords.slice(i+1).includes(newWords[j]))) {
        out.push(`<del>${oldWords[i]}</del>`);
        i++;
      }
      if (j < newWords.length && (!oldWords[i] || !newWords.slice(j+1).includes(oldWords[i]))) {
        out.push(`<ins>${newWords[j]}</ins>`);
        j++;
      }
      if (i >= oldWords.length && j >= newWords.length) break;
    }
  }
  return out.join(' ');
}
