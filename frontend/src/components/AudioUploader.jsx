import React, { useRef, useState } from 'react';
import { UploadCloud, Music, FileAudio, AlertCircle, ArrowRight, Play, Check } from 'lucide-react';

const ALLOWED_EXTS = ['.wav', '.mp3', '.m4a', '.flac', '.ogg'];

export default function AudioUploader({
  audioFile,
  setAudioFile,
  onStartProcessing,
  isProcessing,
  error,
  setError,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const validateAndSetFile = (file) => {
    setError(null);
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setError(`Unsupported format (${ext}). Supported formats: ${ALLOWED_EXTS.join(', ')}`);
      return;
    }

    if (file.size === 0) {
      setError('The selected audio file is empty (0 bytes). Please upload a valid recording.');
      return;
    }

    setAudioFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : audioFile
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-slate-700/80 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTS.join(',')}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          {audioFile ? (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10 animate-fade-in">
              <Check className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <UploadCloud className="w-8 h-8" />
            </div>
          )}

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-100">
              {audioFile ? audioFile.name : 'Upload English Meeting Recording'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              {audioFile
                ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI Pipeline`
                : 'Drag & drop an audio file or click to browse'}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
            <span>Supports: WAV, MP3, M4A, FLAC, OGG</span>
          </div>
        </div>
      </div>

      {/* Audio preview if selected */}
      {audioFile && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileAudio className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">{audioFile.name}</div>
              <div className="text-[11px] text-slate-400">Selected audio source</div>
            </div>
          </div>

          <div className="w-full sm:w-72">
            <audio
              controls
              src={URL.createObjectURL(audioFile)}
              className="w-full h-8 rounded-lg opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start space-x-3 text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">{error}</div>
        </div>
      )}

      {/* Action CTA */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onStartProcessing}
          disabled={!audioFile || isProcessing}
          className={`w-full sm:w-auto px-7 py-3 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
            !audioFile || isProcessing
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
              : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 active:scale-[0.99]'
          }`}
        >
          <span>Run Meeting Pipeline</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
