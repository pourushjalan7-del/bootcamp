import React, { useState } from 'react';
import { BookOpen, Plus, X, UploadCloud, ChevronDown, ChevronUp } from 'lucide-react';

export default function GlossaryEditor({ terms, setTerms, glossaryFile, setGlossaryFile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const handleAddTerm = (e) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (clean && !terms.includes(clean)) {
      setTerms([...terms, clean]);
      setInputVal('');
    }
  };

  const handleRemoveTerm = (termToRemove) => {
    setTerms(terms.filter((t) => t !== termToRemove));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGlossaryFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const fileTerms = content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith('#'));
        
        // Merge without duplicates
        const merged = Array.from(new Set([...terms, ...fileTerms]));
        setTerms(merged);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <span>Domain Terminology &amp; Glossary</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {terms.length} terms loaded
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Assists Stage 1 (Whisper biasing) &amp; Stage 2 (Phonetic-RAG error correction)
            </p>
          </div>
        </div>
        <div className="text-slate-400">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-slate-800 space-y-4 bg-slate-950/40">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleAddTerm} className="flex-1 flex gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Add custom acronym/term (e.g. Kubernetes, LoRA, RLHF)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <label className="cursor-pointer px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors">
              <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
              <span>{glossaryFile ? glossaryFile.name : 'Upload .txt Glossary'}</span>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-900/80 rounded-lg border border-slate-800/80">
            {terms.length === 0 ? (
              <span className="text-xs text-slate-500 italic p-1">No terms specified yet.</span>
            ) : (
              terms.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-slate-700 px-2.5 py-1 rounded-md transition-colors"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTerm(t)}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
