import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import AudioUploader from './components/AudioUploader';
import GlossaryEditor from './components/GlossaryEditor';
import PipelineProgress from './components/PipelineProgress';
import AudioPlayerBar from './components/AudioPlayerBar';
import TranscriptViewer from './components/TranscriptViewer';
import MeetingSummary from './components/MeetingSummary';
import KeyDecisions from './components/KeyDecisions';
import ActionItems from './components/ActionItems';
import PipelineDiagnostics from './components/PipelineDiagnostics';
import ExportBar from './components/ExportBar';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  CheckSquare,
  Cpu,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

const API_BASE = ''; // proxied by Vite or relative in FastAPI static

export default function App() {
  const [audioFile, setAudioFile] = useState(null);
  const [glossaryFile, setGlossaryFile] = useState(null);
  const [terms, setTerms] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState('idle'); // 'idle' | 'running' | 'done' | 'error'
  const [jobProgress, setJobProgress] = useState([]);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [markdownExport, setMarkdownExport] = useState('');
  const [diffHtml, setDiffHtml] = useState('');

  const [activeTab, setActiveTab] = useState('transcript');
  const [currentSec, setCurrentSec] = useState(0);
  const playerRef = useRef(null);

  // Load default glossary terms from backend on mount
  useEffect(() => {
    fetch(`${API_BASE}/glossary`)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.terms)) {
          setTerms(data.terms);
        }
      })
      .catch(() => {
        // Fallback default domain terms if backend endpoint not yet active
        setTerms([
          'Kubernetes',
          'PyTorch',
          'FastAPI',
          'LoRA',
          'Quantization',
          'Docker',
          'Microservices',
          'GraphQL',
          'PostgreSQL',
          'Redis',
          'gRPC',
          'Diarization',
        ]);
      });
  }, []);

  // Polling for job updates
  useEffect(() => {
    if (!jobId || jobStatus !== 'running') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/jobs/${jobId}`);
        if (!res.ok) throw new Error('Failed to fetch job status');
        const data = await res.json();

        setJobProgress(data.progress || []);

        if (data.status === 'done') {
          clearInterval(interval);
          setJobStatus('done');
          setIsProcessing(false);
          if (data.result) {
            setPipelineResult(data.result.record);
            setMarkdownExport(data.result.markdown || '');
            setDiffHtml(data.result.diff_html || '');
          }
        } else if (data.status === 'error') {
          clearInterval(interval);
          setJobStatus('error');
          const errList = (data.result?.errors && data.result.errors.length > 0)
            ? data.result.errors
            : (data.result?.record?.errors && data.result.record.errors.length > 0)
            ? data.result.record.errors
            : ['An error occurred during pipeline execution.'];
          setError(errList.join(' | '));
        }
      } catch (err) {
        console.error('Job polling error:', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  const handleStartProcessing = async () => {
    if (!audioFile) return;

    setError(null);
    setIsProcessing(true);
    setJobStatus('running');
    setJobProgress(['Submitting audio to pipeline...']);
    setPipelineResult(null);

    const formData = new FormData();
    formData.append('audio', audioFile);

    if (glossaryFile) {
      formData.append('glossary', glossaryFile);
    } else if (terms.length > 0) {
      formData.append('glossary_text', terms.join('\n'));
    }

    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to submit audio job');
      }

      const data = await res.json();
      setJobId(data.job_id);
    } catch (err) {
      setIsProcessing(false);
      setJobStatus('error');
      setError(err.message || 'Pipeline submission error');
    }
  };

  const handleReset = () => {
    setAudioFile(null);
    setGlossaryFile(null);
    setIsProcessing(false);
    setError(null);
    setJobId(null);
    setJobStatus('idle');
    setJobProgress([]);
    setPipelineResult(null);
    setActiveTab('transcript');
  };

  const handleSeek = (sec) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(sec);
    }
  };

  const rawTurns = pipelineResult?.raw?.turns || [];
  const refinedTurns = pipelineResult?.refined?.turns || [];
  const docs = pipelineResult?.docs || null;
  const models = pipelineResult?.models || {};
  const timings = pipelineResult?.timings || {};
  const flags = pipelineResult?.flags || [];
  const errors = pipelineResult?.errors || [];

  const audioUrl = audioFile ? URL.createObjectURL(audioFile) : jobId ? `${API_BASE}/jobs/${jobId}/audio` : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-28">
      <Navbar onReset={handleReset} hasResults={!!pipelineResult} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* If no results yet, show Upload & Setup View */}
        {!pipelineResult ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-widest font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                End-to-End Multimodal Intelligence
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                AI Meeting Assistant
              </h1>
              <p className="text-sm text-slate-400 max-w-lg mx-auto">
                Transform English meeting recordings into verified transcripts, domain-refined terminology, structured minutes, agreed decisions, and actionable tasks.
              </p>
            </div>

            {/* Audio Uploader */}
            <AudioUploader
              audioFile={audioFile}
              setAudioFile={setAudioFile}
              onStartProcessing={handleStartProcessing}
              isProcessing={isProcessing}
              error={error}
              setError={setError}
            />

            {/* Domain Glossary Accordion */}
            <GlossaryEditor
              terms={terms}
              setTerms={setTerms}
              glossaryFile={glossaryFile}
              setGlossaryFile={setGlossaryFile}
            />

            {/* Progress tracker if processing */}
            {isProcessing && (
              <PipelineProgress progress={jobProgress} status={jobStatus} />
            )}
          </div>
        ) : (
          /* Results Dashboard View */
          <div className="space-y-6">
            {/* Top Header with summary pills */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Meeting Intelligence Record
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Audio duration: <span className="font-mono text-slate-200">{(pipelineResult.raw?.duration || 0).toFixed(1)}s</span> •
                  Turns: <span className="font-mono text-slate-200">{rawTurns.length}</span> •
                  Language: <span className="font-mono text-slate-200 uppercase">{pipelineResult.raw?.language || 'en'}</span> •
                  Decisions: <span className="font-mono text-emerald-400 font-semibold">{docs?.key_decisions?.length || 0}</span> •
                  Action Items: <span className="font-mono text-indigo-400 font-semibold">{docs?.action_items?.length || 0}</span>
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Process Another Audio</span>
                </button>
              </div>
            </div>

            {/* Errors or Warnings alert if partial failure */}
            {errors.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start space-x-3 text-rose-300">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold">Pipeline warnings encountered:</div>
                  {errors.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto">
              <button
                onClick={() => setActiveTab('transcript')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
                  activeTab === 'transcript'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Transcript &amp; Refinement Diff</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 ml-1">
                  {rawTurns.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('minutes')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
                  activeTab === 'minutes'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Summary &amp; Minutes</span>
              </button>

              <button
                onClick={() => setActiveTab('decisions')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
                  activeTab === 'decisions'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Key Decisions</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 ml-1">
                  {docs?.key_decisions?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('actions')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
                  activeTab === 'actions'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Action Items</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 ml-1">
                  {docs?.action_items?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
                  activeTab === 'diagnostics'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>Diagnostics &amp; Models</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div>
              {activeTab === 'transcript' && (
                <TranscriptViewer
                  rawTurns={rawTurns}
                  refinedTurns={refinedTurns}
                  diffHtml={diffHtml}
                  onSeek={handleSeek}
                  currentSec={currentSec}
                />
              )}

              {activeTab === 'minutes' && (
                <MeetingSummary
                  summary={docs?.summary || ''}
                  minutes={docs?.minutes || []}
                />
              )}

              {activeTab === 'decisions' && (
                <KeyDecisions
                  decisions={docs?.key_decisions || []}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'actions' && (
                <ActionItems
                  actionItems={docs?.action_items || []}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'diagnostics' && (
                <PipelineDiagnostics
                  models={models}
                  timings={timings}
                  flags={flags}
                  errors={errors}
                />
              )}
            </div>

            {/* Export & Download Bar */}
            <ExportBar
              record={pipelineResult}
              markdown={markdownExport}
              jobId={jobId}
            />
          </div>
        )}
      </main>

      {/* Persistent Audio Player Bar */}
      {audioUrl && (
        <div className="fixed bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-50">
          <AudioPlayerBar
            audioUrl={audioUrl}
            playerRef={playerRef}
            currentSec={currentSec}
            setCurrentSec={setCurrentSec}
          />
        </div>
      )}
    </div>
  );
}
