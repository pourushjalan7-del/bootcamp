import React, { useState } from 'react';
import { Download, FileJson, FileText, Check, Copy } from 'lucide-react';

export default function ExportBar({ record, markdown, jobId }) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const handleDownload = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyJson = () => {
    if (!record) return;
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Download Final Meeting Records</span>
        </h4>
        <p className="text-xs text-slate-400 mt-0.5">
          Complies with PS format requirements: human-readable Markdown &amp; machine-readable JSON
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
        {/* Download JSON */}
        <button
          onClick={() =>
            handleDownload(
              JSON.stringify(record, null, 2),
              'meeting_record.json',
              'application/json'
            )
          }
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-2 transition-all hover:scale-[1.02]"
        >
          <FileJson className="w-4 h-4 text-amber-400" />
          <span>Download JSON</span>
        </button>

        {/* Download Markdown */}
        <button
          onClick={() =>
            handleDownload(markdown || '', 'meeting_record.md', 'text/markdown')
          }
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.02]"
        >
          <FileText className="w-4 h-4" />
          <span>Download Markdown</span>
        </button>

        {/* Copy Quick Action */}
        <button
          onClick={handleCopyMarkdown}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
          title="Copy Markdown to Clipboard"
        >
          {copiedMd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
