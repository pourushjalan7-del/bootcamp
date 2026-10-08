import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, FastForward } from 'lucide-react';

function fmtTime(sec) {
  if (isNaN(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

export default function AudioPlayerBar({ audioUrl, playerRef, currentSec, setCurrentSec }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioElemRef = useRef(null);

  useEffect(() => {
    if (audioElemRef.current) {
      playerRef.current = {
        seekTo: (sec) => {
          if (audioElemRef.current) {
            audioElemRef.current.currentTime = sec;
            audioElemRef.current.play();
            setIsPlaying(true);
          }
        },
      };
    }
  }, [playerRef]);

  const togglePlay = () => {
    if (!audioElemRef.current) return;
    if (isPlaying) {
      audioElemRef.current.pause();
    } else {
      audioElemRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioElemRef.current) {
      setCurrentSec(audioElemRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioElemRef.current) {
      setDuration(audioElemRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    if (audioElemRef.current) {
      audioElemRef.current.currentTime = val;
      setCurrentSec(val);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextRate = speeds[nextIdx];
    setPlaybackRate(nextRate);
    if (audioElemRef.current) {
      audioElemRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (!audioElemRef.current) return;
    audioElemRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-30 backdrop-blur-md bg-opacity-95">
      <audio
        ref={audioElemRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-md shadow-indigo-600/30 active:scale-95 flex-shrink-0"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="text-xs font-mono text-slate-300 flex items-center space-x-1">
          <span className="font-semibold text-slate-100">{fmtTime(currentSec)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Progress Slider */}
      <div className="w-full sm:flex-1 mx-0 sm:mx-4 flex items-center">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentSec}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
        />
      </div>

      {/* Controls: Speed, Volume, Reset */}
      <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
        <button
          onClick={cycleSpeed}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-medium border border-slate-700 transition-colors"
          title="Playback speed"
        >
          {playbackRate}x
        </button>

        <button
          onClick={toggleMute}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
