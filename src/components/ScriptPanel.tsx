/**
 * Script Panel — Manual storyboard editor
 * Replaces the AI Director with a fully manual, script-driven workflow.
 * Scenes are divided into 10-second clips (API limit).
 */

import React, { useState, useEffect, useRef } from "react";
import {
  CharacterAsset,
  PropAsset,
  LocationAsset,
  ReferenceFrameAsset,
  CameraSettings,
} from "../types";
import { getAssetHandle } from "../utils";
import {
  Plus,
  Trash2,
  Play,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  Film,
  Clapperboard,
  Loader2,
  Download,
  Upload,
  Copy,
  Check,
  AtSign,
  Settings2,
  SkipForward,
  GripVertical,
  Edit3,
} from "lucide-react";
import { ClipBlueprint, SceneBlueprint } from "./AIDirectorPanel";

const CAMERA_STYLES = ["auto", "static", "drone", "handheld", "dolly", "crane", "orbit", "fpv", "panoramic"];
const CAMERA_PANS = ["none", "left", "right"];
const CAMERA_TILTS = ["none", "up", "down"];
const CAMERA_ZOOMS = ["none", "in", "out"];
const CAMERA_SPEEDS = ["slow", "normal", "fast"];
const TIMES_OF_DAY = ["dawn", "day", "afternoon", "sunset", "night"];

const defaultCamera = (): ClipBlueprint["cameraSettings"] => ({
  pan: "none",
  tilt: "none",
  zoom: "none",
  roll: "none",
  speed: "normal",
  style: "auto",
  timeOfDay: "day",
  motionCurve: "ease-in-out",
});

const defaultClip = (clipNumber: number): ClipBlueprint => ({
  clipNumber,
  title: `Shot ${clipNumber}`,
  prompt: "",
  cameraSettings: defaultCamera(),
  duration: 10,
  generate_audio: true,
  consistencyExplanation: "",
});

const defaultScene = (sceneNumber: number): SceneBlueprint => ({
  sceneTitle: `Escena ${sceneNumber}`,
  sceneDescription: "",
  directorCommentary: "",
  clips: [defaultClip(1)],
});

const STORAGE_KEY = "seedance_script_scenes";

interface ScriptPanelProps {
  characters: CharacterAsset[];
  props: PropAsset[];
  locations: LocationAsset[];
  referenceFrames?: ReferenceFrameAsset[];
  onLoadClipConfig: (clip: ClipBlueprint) => void;
  onRenderClip: (clip: ClipBlueprint, parentBlueprint?: SceneBlueprint, customResolution?: "720p" | "1080p") => void;
  onRenderScene: (blueprint: SceneBlueprint, customResolution?: "720p" | "1080p") => void;
  onRenderSceneSequentially?: (blueprint: SceneBlueprint, customResolution?: "720p" | "1080p") => void;
  isSequentiallyRendering?: boolean;
  sequentialRenderProgress?: { current: number; total: number; status: string } | null;
}

export default function ScriptPanel({
  characters,
  props,
  locations,
  onLoadClipConfig,
  onRenderClip,
  onRenderScene,
  onRenderSceneSequentially,
  isSequentiallyRendering = false,
  sequentialRenderProgress = null,
}: ScriptPanelProps) {
  const [scenes, setScenes] = useState<SceneBlueprint[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [defaultScene(1)];
  });

  const [expandedScenes, setExpandedScenes] = useState<Record<number, boolean>>({ 0: true });
  const [expandedClips, setExpandedClips] = useState<Record<string, boolean>>({});
  const [expandedCamera, setExpandedCamera] = useState<Record<string, boolean>>({});
  const [renderRes, setRenderRes] = useState<"720p" | "1080p">("1080p");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist to localStorage whenever scenes change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
  }, [scenes]);

  /* ─── Scene helpers ─────────────────────────── */
  const addScene = () => {
    setScenes(prev => {
      const newScene = defaultScene(prev.length + 1);
      const newIdx = prev.length;
      setExpandedScenes(s => ({ ...s, [newIdx]: true }));
      return [...prev, newScene];
    });
  };

  const deleteScene = (si: number) => {
    setScenes(prev => prev.filter((_, i) => i !== si));
  };

  const updateSceneTitle = (si: number, title: string) => {
    setScenes(prev => prev.map((s, i) => i === si ? { ...s, sceneTitle: title } : s));
  };

  /* ─── Clip helpers ───────────────────────────── */
  const addClip = (si: number) => {
    setScenes(prev => prev.map((s, i) => {
      if (i !== si) return s;
      const n = s.clips.length + 1;
      const newClip = defaultClip(n);
      const clipKey = `${si}-${n - 1}`;
      setExpandedClips(c => ({ ...c, [clipKey]: true }));
      return { ...s, clips: [...s.clips, newClip] };
    }));
  };

  const deleteClip = (si: number, ci: number) => {
    setScenes(prev => prev.map((s, i) => {
      if (i !== si) return s;
      const clips = s.clips.filter((_, j) => j !== ci).map((c, j) => ({ ...c, clipNumber: j + 1 }));
      return { ...s, clips };
    }));
  };

  const updateClipField = (si: number, ci: number, field: keyof ClipBlueprint, value: any) => {
    setScenes(prev => prev.map((s, i) => {
      if (i !== si) return s;
      const clips = s.clips.map((c, j) => j !== ci ? c : { ...c, [field]: value });
      return { ...s, clips };
    }));
  };

  const updateClipCamera = (si: number, ci: number, key: keyof ClipBlueprint["cameraSettings"], value: string) => {
    setScenes(prev => prev.map((s, i) => {
      if (i !== si) return s;
      const clips = s.clips.map((c, j) =>
        j !== ci ? c : { ...c, cameraSettings: { ...c.cameraSettings, [key]: value } }
      );
      return { ...s, clips };
    }));
  };

  /* ─── @Mention inserter ──────────────────────── */
  const insertMention = (si: number, ci: number, handle: string) => {
    setScenes(prev => prev.map((s, i) => {
      if (i !== si) return s;
      const clips = s.clips.map((c, j) => {
        if (j !== ci) return c;
        const current = c.prompt;
        const sep = current && !current.endsWith(" ") ? " " : "";
        return { ...c, prompt: current + sep + handle + " " };
      });
      return { ...s, clips };
    }));
  };

  /* ─── Copy prompt ────────────────────────────── */
  const copyPrompt = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  /* ─── Export / Import ────────────────────────── */
  const exportScript = () => {
    const blob = new Blob([JSON.stringify(scenes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guion.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importScript = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed)) {
          setScenes(parsed);
          setExpandedScenes({ 0: true });
        }
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ─── Duplicate clip ──────────────────────────── */
  const duplicateClip = (si: number, ci: number) => {
    setScenes(prev => prev.map((s, i) => {
      if (i !== si) return s;
      const original = s.clips[ci];
      const n = s.clips.length + 1;
      const dupe: ClipBlueprint = { ...JSON.parse(JSON.stringify(original)), clipNumber: n, title: original.title + " (copia)" };
      return { ...s, clips: [...s.clips, dupe] };
    }));
  };

  /* ─── Count total clips ──────────────────────── */
  const totalClips = scenes.reduce((acc, s) => acc + s.clips.length, 0);
  const totalSeconds = totalClips * 10;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  /* ─── Render ─────────────────────────────────── */
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#121317]">
      {/* Header stats + controls */}
      <div className="px-3 py-2.5 border-b border-white/5 bg-[#0e0f12] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <Film className="w-3 h-3 text-[#d1f025]" />
            <span className="font-mono text-[#d1f025]">{scenes.length} escenas</span>
            <span className="text-white/20">·</span>
            <span className="font-mono">{totalClips} clips</span>
            <span className="text-white/20">·</span>
            <span className="font-mono">{totalMinutes}m{remainingSeconds}s</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Resolution */}
            <select
              value={renderRes}
              onChange={e => setRenderRes(e.target.value as "720p" | "1080p")}
              className="text-[9px] bg-white/5 border border-white/10 rounded px-1 py-0.5 text-gray-300 focus:outline-none"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
            {/* Export */}
            <button
              onClick={exportScript}
              title="Exportar guión JSON"
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <Download className="w-3 h-3" />
            </button>
            {/* Import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Importar guión JSON"
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <Upload className="w-3 h-3" />
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importScript} />
          </div>
        </div>

        {/* Sequential render progress */}
        {isSequentiallyRendering && sequentialRenderProgress && (
          <div className="mt-1 p-2 bg-[#d1f025]/10 border border-[#d1f025]/20 rounded text-[10px]">
            <div className="flex items-center gap-1.5 mb-1">
              <Loader2 className="w-3 h-3 text-[#d1f025] animate-spin" />
              <span className="text-[#d1f025] font-medium">Renderizando {sequentialRenderProgress.current}/{sequentialRenderProgress.total}</span>
            </div>
            <p className="text-gray-400 leading-tight">{sequentialRenderProgress.status}</p>
            <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d1f025] rounded-full transition-all"
                style={{ width: `${(sequentialRenderProgress.current / sequentialRenderProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Scenes list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-2">
        {scenes.map((scene, si) => (
          <SceneCard
            key={si}
            scene={scene}
            sceneIndex={si}
            isExpanded={!!expandedScenes[si]}
            expandedClips={expandedClips}
            expandedCamera={expandedCamera}
            characters={characters}
            props={props}
            locations={locations}
            renderRes={renderRes}
            copiedId={copiedId}
            isSequentiallyRendering={isSequentiallyRendering}
            onToggleScene={() => setExpandedScenes(s => ({ ...s, [si]: !s[si] }))}
            onToggleClip={(clipKey) => setExpandedClips(c => ({ ...c, [clipKey]: !c[clipKey] }))}
            onToggleCamera={(key) => setExpandedCamera(c => ({ ...c, [key]: !c[key] }))}
            onUpdateTitle={(title) => updateSceneTitle(si, title)}
            onDeleteScene={() => deleteScene(si)}
            onAddClip={() => addClip(si)}
            onDeleteClip={(ci) => deleteClip(si, ci)}
            onDuplicateClip={(ci) => duplicateClip(si, ci)}
            onUpdateClipField={(ci, field, value) => updateClipField(si, ci, field, value)}
            onUpdateClipCamera={(ci, key, value) => updateClipCamera(si, ci, key, value)}
            onInsertMention={(ci, handle) => insertMention(si, ci, handle)}
            onCopyPrompt={(text, key) => copyPrompt(text, key)}
            onLoadClip={(clip) => onLoadClipConfig(clip)}
            onRenderClip={(clip) => onRenderClip(clip, scene, renderRes)}
            onRenderSceneAll={() => onRenderScene(scene, renderRes)}
            onRenderSceneSequentially={() => onRenderSceneSequentially?.(scene, renderRes)}
            hasSequentialRender={!!onRenderSceneSequentially}
          />
        ))}

        {/* Add Scene */}
        <button
          onClick={addScene}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-white/15 rounded-lg text-xs text-gray-500 hover:text-[#d1f025] hover:border-[#d1f025]/40 hover:bg-[#d1f025]/5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva Escena
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/* Scene Card                                              */
/* ═══════════════════════════════════════════════════════ */
interface SceneCardProps {
  scene: SceneBlueprint;
  sceneIndex: number;
  isExpanded: boolean;
  expandedClips: Record<string, boolean>;
  expandedCamera: Record<string, boolean>;
  characters: CharacterAsset[];
  props: PropAsset[];
  locations: LocationAsset[];
  renderRes: "720p" | "1080p";
  copiedId: string | null;
  isSequentiallyRendering: boolean;
  onToggleScene: () => void;
  onToggleClip: (key: string) => void;
  onToggleCamera: (key: string) => void;
  onUpdateTitle: (title: string) => void;
  onDeleteScene: () => void;
  onAddClip: () => void;
  onDeleteClip: (ci: number) => void;
  onDuplicateClip: (ci: number) => void;
  onUpdateClipField: (ci: number, field: keyof ClipBlueprint, value: any) => void;
  onUpdateClipCamera: (ci: number, key: keyof ClipBlueprint["cameraSettings"], value: string) => void;
  onInsertMention: (ci: number, handle: string) => void;
  onCopyPrompt: (text: string, key: string) => void;
  onLoadClip: (clip: ClipBlueprint) => void;
  onRenderClip: (clip: ClipBlueprint) => void;
  onRenderSceneAll: () => void;
  onRenderSceneSequentially: () => void;
  hasSequentialRender: boolean;
}

function SceneCard({
  scene, sceneIndex, isExpanded, expandedClips, expandedCamera,
  characters, props, locations, renderRes, copiedId, isSequentiallyRendering,
  onToggleScene, onToggleClip, onToggleCamera,
  onUpdateTitle, onDeleteScene, onAddClip,
  onDeleteClip, onDuplicateClip, onUpdateClipField, onUpdateClipCamera,
  onInsertMention, onCopyPrompt, onLoadClip, onRenderClip,
  onRenderSceneAll, onRenderSceneSequentially, hasSequentialRender,
}: SceneCardProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(scene.sceneTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const commitTitle = () => {
    setEditingTitle(false);
    if (titleDraft.trim()) onUpdateTitle(titleDraft.trim());
    else setTitleDraft(scene.sceneTitle);
  };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0e0f12]">
      {/* Scene header */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[#1a1c24]">
        <button onClick={onToggleScene} className="text-gray-500 hover:text-white transition-colors">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <Clapperboard className="w-3.5 h-3.5 text-[#d1f025] flex-shrink-0" />

        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(scene.sceneTitle); } }}
            autoFocus
            className="flex-1 min-w-0 bg-white/10 text-white text-xs px-1.5 py-0.5 rounded outline-none border border-[#d1f025]/40"
          />
        ) : (
          <button
            onClick={() => { setEditingTitle(true); setTitleDraft(scene.sceneTitle); }}
            className="flex-1 min-w-0 text-left text-xs font-semibold text-white truncate hover:text-[#d1f025] transition-colors"
            title="Click para renombrar"
          >
            {scene.sceneTitle}
          </button>
        )}

        <span className="text-[9px] text-gray-600 flex-shrink-0">{scene.clips.length} clips · {scene.clips.length * 10}s</span>
        <button onClick={onDeleteScene} className="ml-1 p-0.5 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {isExpanded && (
        <div className="px-2 pb-2 pt-1 space-y-1.5">
          {/* Clips */}
          {scene.clips.map((clip, ci) => {
            const clipKey = `${sceneIndex}-${ci}`;
            const camKey = `cam-${sceneIndex}-${ci}`;
            return (
              <ClipCard
                key={ci}
                clip={clip}
                clipKey={clipKey}
                camKey={camKey}
                clipIndex={ci}
                isExpanded={!!expandedClips[clipKey]}
                isCameraExpanded={!!expandedCamera[camKey]}
                characters={characters}
                props={props}
                locations={locations}
                copiedId={copiedId}
                onToggle={() => onToggleClip(clipKey)}
                onToggleCamera={() => onToggleCamera(camKey)}
                onDelete={() => onDeleteClip(ci)}
                onDuplicate={() => onDuplicateClip(ci)}
                onUpdateField={(field, value) => onUpdateClipField(ci, field, value)}
                onUpdateCamera={(key, value) => onUpdateClipCamera(ci, key, value)}
                onInsertMention={(handle) => onInsertMention(ci, handle)}
                onCopy={(text) => onCopyPrompt(text, clipKey)}
                onLoad={() => onLoadClip(clip)}
                onRender={() => onRenderClip(clip)}
              />
            );
          })}

          {/* Add clip */}
          <button
            onClick={onAddClip}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-gray-600 hover:text-[#d1f025] border border-dashed border-white/10 hover:border-[#d1f025]/30 rounded transition-all"
          >
            <Plus className="w-3 h-3" />
            Agregar clip (10s)
          </button>

          {/* Scene render buttons */}
          {scene.clips.length > 0 && (
            <div className="flex gap-1.5 mt-1">
              <button
                onClick={onRenderSceneAll}
                disabled={isSequentiallyRendering}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium bg-[#d1f025]/15 text-[#d1f025] rounded hover:bg-[#d1f025]/25 transition-all disabled:opacity-40"
                title="Renderizar todos los clips en paralelo"
              >
                <Play className="w-3 h-3" />
                Todo ({renderRes})
              </button>
              {hasSequentialRender && (
                <button
                  onClick={onRenderSceneSequentially}
                  disabled={isSequentiallyRendering}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium bg-white/5 text-gray-300 rounded hover:bg-white/10 transition-all disabled:opacity-40"
                  title="Renderizar clips en secuencia (con continuidad)"
                >
                  {isSequentiallyRendering
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <SkipForward className="w-3 h-3" />
                  }
                  Secuencial
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/* Clip Card                                               */
/* ═══════════════════════════════════════════════════════ */
interface ClipCardProps {
  clip: ClipBlueprint;
  clipKey: string;
  camKey: string;
  clipIndex: number;
  isExpanded: boolean;
  isCameraExpanded: boolean;
  characters: CharacterAsset[];
  props: PropAsset[];
  locations: LocationAsset[];
  copiedId: string | null;
  onToggle: () => void;
  onToggleCamera: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdateField: (field: keyof ClipBlueprint, value: any) => void;
  onUpdateCamera: (key: keyof ClipBlueprint["cameraSettings"], value: string) => void;
  onInsertMention: (handle: string) => void;
  onCopy: (text: string) => void;
  onLoad: () => void;
  onRender: () => void;
}

function ClipCard({
  clip, clipKey, camKey, clipIndex,
  isExpanded, isCameraExpanded,
  characters, props, locations,
  copiedId,
  onToggle, onToggleCamera,
  onDelete, onDuplicate,
  onUpdateField, onUpdateCamera,
  onInsertMention, onCopy, onLoad, onRender,
}: ClipCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const allAssets = [
    ...characters.map(c => ({ label: `@${c.name}`, handle: `@${c.name}`, type: "char" })),
    ...props.map(p => ({ label: `@${p.name}`, handle: `@${p.name}`, type: "prop" })),
    ...locations.map(l => ({ label: `@${l.name}`, handle: `@${l.name}`, type: "loc" })),
  ];

  const promptEmpty = !clip.prompt.trim();

  return (
    <div className={`border rounded-md overflow-hidden transition-all ${isExpanded ? "border-white/15 bg-[#15171e]" : "border-white/8 bg-[#0e0f12]"}`}>
      {/* Clip header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none group"
        onClick={onToggle}
      >
        <span className="w-5 h-5 rounded bg-[#d1f025]/10 text-[#d1f025] text-[9px] font-black flex items-center justify-center flex-shrink-0">
          {clip.clipNumber}
        </span>

        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
        )}

        <span className="flex-1 text-[10px] text-gray-300 group-hover:text-white transition-colors truncate min-w-0">
          {clip.title}
        </span>

        {promptEmpty && (
          <span className="text-[9px] text-orange-400/70 flex-shrink-0">sin prompt</span>
        )}

        <span className="text-[9px] text-gray-600 flex-shrink-0">10s</span>

        {/* Quick render */}
        <button
          onClick={e => { e.stopPropagation(); onRender(); }}
          disabled={promptEmpty}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#d1f025] hover:bg-[#d1f025]/10 transition-all disabled:opacity-20"
          title="Renderizar este clip"
        >
          <PlayCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-2.5 pb-2.5 space-y-2" onClick={e => e.stopPropagation()}>
          {/* Title edit */}
          <input
            value={clip.title}
            onChange={e => onUpdateField("title", e.target.value)}
            placeholder="Título del clip..."
            className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white placeholder-gray-600 focus:outline-none focus:border-[#d1f025]/40"
          />

          {/* Asset mentions */}
          {allAssets.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-600 mb-1 flex items-center gap-1">
                <AtSign className="w-3 h-3" />Insertar en prompt
              </p>
              <div className="flex flex-wrap gap-1">
                {allAssets.map(a => (
                  <button
                    key={a.handle}
                    onClick={() => onInsertMention(a.handle)}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-all ${
                      a.type === "char"
                        ? "bg-purple-500/15 text-purple-300 hover:bg-purple-500/30"
                        : a.type === "prop"
                        ? "bg-blue-500/15 text-blue-300 hover:bg-blue-500/30"
                        : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={clip.prompt}
              onChange={e => onUpdateField("prompt", e.target.value)}
              placeholder="Describe la acción del clip... usa @Personaje, @Locacion"
              rows={3}
              className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#d1f025]/30 resize-none leading-relaxed"
            />
            {clip.prompt && (
              <button
                onClick={() => onCopy(clip.prompt, clipKey)}
                className="absolute top-1.5 right-1.5 p-0.5 text-gray-600 hover:text-gray-400 transition-colors"
                title="Copiar prompt"
              >
                {copiedId === clipKey ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Audio toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => onUpdateField("generate_audio", !clip.generate_audio)}
              className={`relative w-7 h-4 rounded-full transition-colors ${clip.generate_audio ? "bg-[#d1f025]" : "bg-white/10"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${clip.generate_audio ? "translate-x-3" : "translate-x-0"}`} />
            </div>
            <span className="text-[10px] text-gray-400">Audio</span>
          </label>

          {/* Camera settings (collapsible) */}
          <div>
            <button
              onClick={onToggleCamera}
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Settings2 className="w-3 h-3" />
              Cámara
              {isCameraExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span className="text-[9px] text-gray-700 ml-0.5">{clip.cameraSettings.style} · {clip.cameraSettings.timeOfDay}</span>
            </button>

            {isCameraExpanded && (
              <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
                {[
                  { label: "Estilo", key: "style", options: CAMERA_STYLES },
                  { label: "Hora", key: "timeOfDay", options: TIMES_OF_DAY },
                  { label: "Pan", key: "pan", options: CAMERA_PANS },
                  { label: "Tilt", key: "tilt", options: CAMERA_TILTS },
                  { label: "Zoom", key: "zoom", options: CAMERA_ZOOMS },
                  { label: "Speed", key: "speed", options: CAMERA_SPEEDS },
                ].map(({ label, key, options }) => (
                  <div key={key}>
                    <p className="text-[9px] text-gray-600 mb-0.5">{label}</p>
                    <select
                      value={(clip.cameraSettings as any)[key]}
                      onChange={e => onUpdateCamera(key as any, e.target.value)}
                      className="w-full text-[9px] bg-white/5 border border-white/10 rounded px-1 py-0.5 text-gray-300 focus:outline-none"
                    >
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              onClick={onRender}
              disabled={promptEmpty}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold bg-[#d1f025] text-black rounded hover:bg-[#bfdc1e] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Play className="w-3 h-3" />
              Render
            </button>
            <button
              onClick={onLoad}
              disabled={promptEmpty}
              title="Cargar en el Composer"
              className="py-1.5 px-2 text-[10px] bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all disabled:opacity-30"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onClick={onDuplicate}
              title="Duplicar clip"
              className="py-1.5 px-2 text-[10px] bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={onDelete}
              title="Eliminar clip"
              className="py-1.5 px-2 text-[10px] bg-white/5 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
