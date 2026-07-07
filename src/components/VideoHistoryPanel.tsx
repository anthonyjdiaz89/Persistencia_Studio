/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { VideoTask } from "../types";
import { 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  ExternalLink, 
  Film,
  Zap,
  RotateCcw,
  BadgeAlert,
  History
} from "lucide-react";

interface VideoHistoryPanelProps {
  tasks: VideoTask[];
  onCheckStatus: (taskId: string) => void;
  onReplayTask: (task: VideoTask) => void;
  isPollingMap: Record<string, boolean>;
}

export default function VideoHistoryPanel({ 
  tasks, 
  onCheckStatus, 
  onReplayTask,
  isPollingMap 
}: VideoHistoryPanelProps) {
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 shadow-2xl flex flex-col h-full text-text-primary" id="history-panel">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#71717A]">Generation History</h2>
            <p className="text-[10px] text-text-secondary">Track and play your cinematic creations</p>
          </div>
        </div>
        <div className="text-[10px] bg-[#050506] px-2 py-1 rounded text-[#71717A] border border-dark-border font-mono">
          TOTAL: <span className="text-orange-400 font-bold">{tasks.length}</span>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto max-h-[600px] pr-1 space-y-4 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 bg-dark-input/10 rounded-xl border border-dashed border-dark-border">
            <Film className="w-10 h-10 text-[#71717A] animate-pulse" />
            <div>
              <p className="text-xs text-slate-300 font-medium">No videos generated yet</p>
              <p className="text-[10px] text-[#71717A] mt-1 max-w-[200px]">
                Compose a prompt, set your cinema camera movements, and click Generate!
              </p>
            </div>
          </div>
        ) : (
          tasks.map((task) => {
            const isCompleted = task.status === "completed";
            const isFailed = task.status === "failed";
            const isPending = task.status === "queued" || task.status === "generating";
            const videoUrl = task.data?.results?.[0];
            const polling = isPollingMap[task.id] || false;

            return (
              <div 
                key={task.id} 
                id={`task-${task.id}`}
                className={`p-4 rounded border transition-all space-y-3 ${
                  isCompleted 
                    ? "bg-[#050506]/30 border-dark-border hover:border-orange-500/20" 
                    : isFailed 
                    ? "bg-rose-950/5 border-rose-900/20" 
                    : "bg-orange-950/5 border-orange-500/20 animate-pulse"
                }`}
              >
                {/* Status Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isCompleted && (
                      <span className="flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready
                      </span>
                    )}
                    {isFailed && (
                      <span className="flex items-center text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-wider">
                        <XCircle className="w-3 h-3 mr-1" />
                        Failed
                      </span>
                    )}
                    {isPending && (
                      <span className="flex items-center text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 uppercase tracking-wider animate-pulse">
                        <RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin text-orange-400" />
                        {task.status === "queued" ? "Queued..." : "Generating..."}
                      </span>
                    )}

                    <span className="text-[10px] text-[#71717A] font-mono">
                      {formatDate(task.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Manual Refresh Button */}
                    {isPending && (
                      <button
                        id={`refresh-task-${task.id}`}
                        onClick={() => onCheckStatus(task.id)}
                        disabled={polling}
                        className="p-1 bg-[#1F1F23] hover:bg-[#27272A] text-slate-300 rounded border border-[#3F3F46] transition-all disabled:opacity-50"
                        title="Check current status"
                      >
                        <RefreshCw className={`w-3 h-3 ${polling ? "animate-spin text-orange-400" : ""}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Prompt Details */}
                <div className="space-y-1">
                  <p className="text-xs text-[#E4E4E7] font-medium leading-relaxed break-words">
                    {task.input?.prompt || "Cinematic task"}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[9px] font-mono bg-[#050506] border border-dark-border px-1.5 py-0.5 rounded text-[#71717A]">
                      Mode: {task.input?.generation_type || "text-to-video"}
                    </span>
                    <span className="text-[9px] font-mono bg-[#050506] border border-dark-border px-1.5 py-0.5 rounded text-[#71717A]">
                      Aspect: {task.input?.aspect_ratio || "16:9"}
                    </span>
                    <span className="text-[9px] font-mono bg-[#050506] border border-dark-border px-1.5 py-0.5 rounded text-[#71717A]">
                      Res: {task.input?.resolution || "720p"}
                    </span>
                    <span className="text-[9px] font-mono bg-[#050506] border border-dark-border px-1.5 py-0.5 rounded text-[#71717A]">
                      Seed: {task.input?.seed !== undefined && task.input.seed !== -1 ? task.input.seed : "Random (-1)"}
                    </span>
                  </div>
                </div>

                {/* Video Outcome / Loader */}
                {isCompleted && videoUrl ? (
                  <div className="space-y-2.5 pt-1.5">
                    <div className="relative aspect-video bg-black rounded overflow-hidden border border-dark-border group/player shadow-inner">
                      <video 
                        src={videoUrl} 
                        controls 
                        preload="metadata"
                        className="w-full h-full object-contain"
                        poster={task.data?.last_frame_url || undefined}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[10px] text-[#71717A] font-mono">
                        ID: <span className="text-[#E4E4E7]">{task.id.slice(0, 8)}...</span>
                      </span>

                      <div className="flex items-center space-x-2">
                        {/* Replay Config */}
                        <button
                          id={`replay-task-${task.id}`}
                          onClick={() => onReplayTask(task)}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-[#1F1F23] hover:bg-[#27272A] text-[#71717A] border border-[#3F3F46] rounded text-[11px] font-medium transition-all"
                          title="Load settings back into composer"
                        >
                          <RotateCcw className="w-3 h-3 text-orange-400" />
                          <span>Use Config</span>
                        </button>

                        {/* Open in tab */}
                        <a 
                          href={videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 px-2 py-1 bg-[#1F1F23] hover:bg-[#27272A] text-slate-300 border border-[#3F3F46] rounded text-[11px] font-medium transition-all"
                        >
                          <ExternalLink className="w-3 h-3 text-[#71717A]" />
                          <span>Link</span>
                        </a>

                        {/* Direct Download */}
                        <a 
                          href={videoUrl} 
                          download={`seedance-${task.id}.mp4`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 text-black rounded text-[11px] font-bold transition-all shadow-sm"
                        >
                          <Download className="w-3 h-3 text-black" />
                          <span>Save</span>
                        </a>
                      </div>
                    </div>

                    {task.data?.processing_time && (
                      <div className="text-[10px] text-[#71717A] flex items-center justify-end font-mono">
                        <Clock className="w-3.5 h-3.5 text-[#71717A] mr-1" />
                        Rendered in {task.data.processing_time}s
                      </div>
                    )}
                  </div>
                ) : isFailed ? (
                  <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded space-y-1 text-xs">
                    <div className="flex items-center text-rose-400 font-medium space-x-1">
                      <BadgeAlert className="w-4 h-4 shrink-0" />
                      <span>Generation failed</span>
                    </div>
                    <p className="text-[#71717A] text-[11px] leading-relaxed break-words">
                      Reason: <span className="font-mono text-rose-300 bg-rose-950/20 px-1 py-0.5 rounded">{task.failed_reason || "provider_failed"}</span>
                    </p>
                    <div className="pt-2 flex justify-end">
                      <button
                        id={`retry-task-${task.id}`}
                        onClick={() => onReplayTask(task)}
                        className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold uppercase tracking-wider flex items-center"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reload Prompt to Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-orange-950/10 border border-orange-900/10 rounded space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                        <span className="font-medium text-slate-300">Rendering video scene...</span>
                      </div>
                      <span className="text-[10px] font-mono text-orange-400">Polling active</span>
                    </div>

                    <div className="w-full bg-black h-1.5 rounded overflow-hidden border border-dark-border shadow-inner">
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 h-full w-2/3 rounded animate-pulse animate-infinite" />
                    </div>

                    <p className="text-[10px] text-[#71717A] text-center italic">
                      This usually takes 30-60 seconds depending on resolution. Feel free to draft your next shot while you wait!
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
