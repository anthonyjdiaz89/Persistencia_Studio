/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  CharacterAsset, 
  PropAsset, 
  LocationAsset, 
  CameraSettings,
  GenerationInput,
  ReferenceFrameAsset
} from "../types";
import { 
  Sparkles, 
  Send, 
  Plus, 
  RefreshCw, 
  Clapperboard, 
  Play, 
  ArrowRight, 
  HelpCircle,
  Video,
  CheckCircle,
  Flame,
  AlertCircle,
  Coins,
  ChevronRight,
  MessageSquare,
  Brain
} from "lucide-react";
import { uploadImageToSupabase } from "../lib/firebase";

export interface ClipBlueprint {
  clipNumber: number;
  title: string;
  prompt: string;
  cameraSettings: {
    pan: string;
    tilt: string;
    zoom: string;
    roll: string;
    speed: string;
    style: string;
  };
  duration: number;
  generate_audio: boolean;
  consistencyExplanation: string;
  image_urls?: string[];
}

export interface SceneBlueprint {
  sceneTitle: string;
  sceneDescription: string;
  directorCommentary: string;
  clips: ClipBlueprint[];
}

interface Message {
  id: string;
  sender: "user" | "director";
  text: string;
  blueprint?: SceneBlueprint;
  timestamp: Date;
  image_urls?: string[];
}

interface AIDirectorPanelProps {
  characters: CharacterAsset[];
  props: PropAsset[];
  locations: LocationAsset[];
  referenceFrames?: ReferenceFrameAsset[];
  hasGeminiKey: boolean;
  onLoadClipConfig: (clip: ClipBlueprint) => void;
  onRenderClip: (clip: ClipBlueprint, parentBlueprint?: SceneBlueprint, customResolution?: "720p" | "1080p") => void;
  onRenderScene: (blueprint: SceneBlueprint, customResolution?: "720p" | "1080p") => void;
  onRenderSceneSequentially?: (blueprint: SceneBlueprint, customResolution?: "720p" | "1080p") => void;
  isSequentiallyRendering?: boolean;
  sequentialRenderProgress?: {
    current: number;
    total: number;
    status: string;
  } | null;
  onAddReferenceFrame?: (frame: Omit<ReferenceFrameAsset, "id">) => void;
}

export default function AIDirectorPanel({
  characters,
  props,
  locations,
  referenceFrames = [],
  hasGeminiKey,
  onLoadClipConfig,
  onRenderClip,
  onRenderScene,
  onRenderSceneSequentially,
  isSequentiallyRendering = false,
  sequentialRenderProgress = null,
  onAddReferenceFrame
}: AIDirectorPanelProps) {
  const [inputText, setInputText] = useState("");
  const [directorModel, setDirectorModel] = useState<"gemma" | "gemini">("gemma");
  const [gemmaThinking, setGemmaThinking] = useState(false);
  const [renderResolution, setRenderResolution] = useState<"720p" | "1080p">("720p");
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [attachedImageUrls, setAttachedImageUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<{
    prompt: string;
    image_urls?: string[];
  } | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Removed: resizeAndConvertToBase64 - now using direct Supabase Storage upload

  const handleChatImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUploadError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        try {
          setIsUploadingImage(true);
          // Upload directly to Supabase Storage
          const imageUrl = await uploadImageToSupabase(file, "video-assets", "director-images");
          
          // Add to attached images in chat
          setAttachedImageUrls(prev => [...prev, imageUrl]);
          
          // Also register as a reference frame asset if prop is available
          if (onAddReferenceFrame) {
            onAddReferenceFrame({
              name: file.name,
              description: "Director reference",
              imageUrl
            });
          }
        } catch (err: any) {
          console.error("Upload error:", err);
          setImageUploadError("No se pudo subir la imagen a Supabase Storage.");
        } finally {
          setIsUploadingImage(false);
        }
      } else {
        setImageUploadError("Por favor selecciona un archivo de imagen válido.");
      }
    }
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = localStorage.getItem("seedance_director_messages");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: "welcome",
        sender: "director",
        text: "Salutations! I am your AI Cinematic Director. Describe the overarching scene story or vision you want to generate. I will build a highly consistent, clip-by-clip storyboard blueprint referencing your characters, props, and locations with cinematic camera tracks, which you can queue for rendering in one click!",
        timestamp: new Date()
      }
    ];
  });

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync messages to local storage
  useEffect(() => {
    localStorage.setItem("seedance_director_messages", JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const insertAsset = (handle: string) => {
    setInputText(prev => prev ? `${prev} ${handle}` : handle);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: inputText.trim(),
      timestamp: new Date(),
      image_urls: attachedImageUrls.length > 0 ? [...attachedImageUrls] : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setAttachedImageUrls([]);
    setLoading(true);
    setError(null);
    setLastRequest({
      prompt: userMsg.text,
      image_urls: userMsg.image_urls
    });

    // Dynamic cinematic loading stages
    const stages = [
      "Securing stage coordinates...",
      "Analyzing available character casting...",
      "Setting up storyboard camera motion tracks...",
      "Calculating temporal frame-to-frame continuity...",
      "Finalizing scene audio and render prompts..."
    ];

    let currentStageIdx = 0;
    setLoadingStep(stages[0]);

    const stageInterval = setInterval(() => {
      currentStageIdx = (currentStageIdx + 1) % stages.length;
      setLoadingStep(stages[currentStageIdx]);
    }, 1500);

    try {
      const response = await fetch("/api/ai-director/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: directorModel,
          thinking: gemmaThinking,
          prompt: userMsg.text,
          history: messages,
          attachedImageUrls: userMsg.image_urls || [],
          characters,
          props,
          locations,
          referenceFrames
        })
      });

      clearInterval(stageInterval);

      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (text.includes("upstream request timeout") || text.includes("upstream response error") || response.status === 504 || response.status === 502) {
          throw new Error("El modelo Gemma de NVIDIA NIM tardó demasiado en responder (tiempo de espera agotado). Intenta simplificar tu prompt, desactiva la opción 'Razonamiento (Thinking)' o cambia al motor Gemini 3.5 Flash para obtener una respuesta instantánea.");
        }
        throw new Error(`Error del servidor (${response.status}): ${text.slice(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to generate storyboard. Check your Gemini/Gemma API Key configuration.");
      }

      const directorMsg: Message = {
        id: `msg-${Date.now()}-dir`,
        sender: "director",
        text: data.directorCommentary || "Here is the storyboard blueprint I've designed for your scene:",
        blueprint: data,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, directorMsg]);
    } catch (err: any) {
      clearInterval(stageInterval);
      console.error(err);
      setError(err.message || "An unexpected error occurred during storyboarding.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!lastRequest || loading) return;

    setLoading(true);
    setError(null);

    // Dynamic cinematic loading stages
    const stages = [
      "Securing stage coordinates...",
      "Analyzing available character casting...",
      "Setting up storyboard camera motion tracks...",
      "Calculating temporal frame-to-frame continuity...",
      "Finalizing scene audio and render prompts..."
    ];

    let currentStageIdx = 0;
    setLoadingStep(stages[0]);

    const stageInterval = setInterval(() => {
      currentStageIdx = (currentStageIdx + 1) % stages.length;
      setLoadingStep(stages[currentStageIdx]);
    }, 1500);

    try {
      const response = await fetch("/api/ai-director/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: directorModel,
          thinking: gemmaThinking,
          prompt: lastRequest.prompt,
          history: messages,
          attachedImageUrls: lastRequest.image_urls || [],
          characters,
          props,
          locations,
          referenceFrames
        })
      });

      clearInterval(stageInterval);

      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (text.includes("upstream request timeout") || text.includes("upstream response error") || response.status === 504 || response.status === 502) {
          throw new Error("El modelo Gemma de NVIDIA NIM tardó demasiado en responder (tiempo de espera agotado). Intenta simplificar tu prompt, desactiva la opción 'Razonamiento (Thinking)' o cambia al motor Gemini 3.5 Flash para obtener una respuesta instantánea.");
        }
        throw new Error(`Error del servidor (${response.status}): ${text.slice(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to generate storyboard. Check your Gemini/Gemma API Key configuration.");
      }

      const directorMsg: Message = {
        id: `msg-${Date.now()}-dir`,
        sender: "director",
        text: data.directorCommentary || "Here is the storyboard blueprint I've designed for your scene:",
        blueprint: data,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, directorMsg]);
    } catch (err: any) {
      clearInterval(stageInterval);
      console.error(err);
      setError(err.message || "An unexpected error occurred during storyboarding.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome",
        sender: "director",
        text: "Salutations! I am your AI Cinematic Director. Describe the overarching scene story or vision you want to generate. I will build a highly consistent, clip-by-clip storyboard blueprint referencing your characters, props, and locations with cinematic camera tracks, which you can queue for rendering in one click!",
        timestamp: new Date()
      }
    ]);
    setShowConfirmClear(false);
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 shadow-2xl flex flex-col h-full text-text-primary" id="ai-director-panel">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#71717A]">AI Scene Director</h2>
            <p className="text-[10px] text-text-secondary">AI-driven multi-clip consistent scriptwriter</p>
          </div>
        </div>
        
        {showConfirmClear ? (
          <div className="flex items-center space-x-1 animate-fade-in" id="confirm-clear-container">
            <span className="text-[10px] text-rose-400 font-bold">¿Borrar chat?</span>
            <button
              onClick={handleClearHistory}
              className="text-[9px] bg-rose-600 hover:bg-rose-500 text-white px-2 py-0.5 rounded font-extrabold cursor-pointer"
            >
              Sí, borrar
            </button>
            <button
              onClick={() => setShowConfirmClear(false)}
              className="text-[9px] bg-[#27272A] hover:bg-[#3F3F46] text-[#E4E4E7] px-2 py-0.5 rounded cursor-pointer"
            >
              No
            </button>
          </div>
        ) : (
          <button
            id="clear-director-history"
            onClick={() => setShowConfirmClear(true)}
            className="text-[9px] bg-dark-input hover:bg-[#27272A] px-2 py-1 rounded text-rose-400 font-bold border border-dark-border transition-all cursor-pointer"
          >
            CLEAR CHAT
          </button>
        )}
      </div>

      {/* Model Selector */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between p-2.5 bg-[#1F1F23]/40 border border-[#3F3F46]/60 rounded-xl text-[10px]">
          <span className="font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
            <MessageSquare className="w-3.5 h-3.5 text-orange-400" /> Motor del Director / Agente:
          </span>
          <div className="flex bg-[#050506] border border-[#27272A] rounded-lg p-0.5" id="agent-brain-selector">
            <button
              type="button"
              onClick={() => setDirectorModel("gemma")}
              className={`px-2.5 py-1 rounded text-[9px] font-extrabold tracking-wide uppercase transition-all cursor-pointer flex items-center gap-1 ${
                directorModel === "gemma"
                  ? "bg-[#d1f025] text-black shadow-md"
                  : "text-[#71717A] hover:text-slate-300"
              }`}
            >
              <Flame className="w-3 h-3" /> Gemma 4-31B
            </button>
            <button
              type="button"
              onClick={() => setDirectorModel("gemini")}
              className={`px-2.5 py-1 rounded text-[9px] font-extrabold tracking-wide uppercase transition-all cursor-pointer flex items-center gap-1 ${
                directorModel === "gemini"
                  ? "bg-[#d1f025] text-black shadow-md"
                  : "text-[#71717A] hover:text-slate-300"
              }`}
            >
              <Sparkles className="w-3 h-3" /> Gemini 3.5 Flash
            </button>
          </div>
        </div>

        {directorModel === "gemma" && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#d1f025]/5 border border-[#d1f025]/20 rounded-lg text-[9px]">
            <span className="text-[#A1A1AA] font-mono flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-[#d1f025]" /> Razonamiento (Thinking):
            </span>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[8px] font-bold uppercase transition-colors ${!gemmaThinking ? "text-[#d1f025]" : "text-[#71717A]"}`}>
                Rápido
              </span>
              <button
                type="button"
                onClick={() => setGemmaThinking(!gemmaThinking)}
                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0 ${
                  gemmaThinking ? "bg-[#d1f025]" : "bg-zinc-700"
                }`}
                role="switch"
                aria-checked={gemmaThinking}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                    gemmaThinking ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`font-mono text-[8px] font-bold uppercase transition-colors ${gemmaThinking ? "text-[#d1f025]" : "text-[#71717A]"}`}>
                Pensar (Lento)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto max-h-[580px] pr-1 space-y-4 custom-scrollbar mb-4 min-h-[300px]">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
            >
              <div className="flex items-center space-x-1.5 text-[9px] text-[#71717A] font-mono px-1">
                <span>{isUser ? "YOU" : "AI CINEMATIC DIRECTOR"}</span>
                <span>•</span>
                <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div
                className={`p-3.5 rounded-xl text-xs max-w-[95%] leading-relaxed ${
                  isUser
                    ? "bg-[#1F1F23] border border-[#3F3F46] text-slate-100 rounded-tr-none"
                    : "bg-orange-500/5 border border-orange-500/10 text-slate-200 rounded-tl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {msg.image_urls && msg.image_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-dark-border">
                    {msg.image_urls.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded border border-dark-border overflow-hidden bg-black/40 group">
                        <img src={url} alt={`Adjunto ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Render Scene Blueprint Timeline if exists */}
                {msg.blueprint && (
                  <div className="mt-4 border-t border-orange-500/15 pt-3.5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xs font-extrabold text-orange-400 uppercase tracking-wide">
                          🎬 Scene: {msg.blueprint.sceneTitle}
                        </h3>
                        <p className="text-[10px] text-[#71717A] italic mt-0.5">
                          {msg.blueprint.sceneDescription}
                        </p>
                      </div>
                      <span className="text-[9px] bg-orange-500/15 border border-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-bold font-mono">
                        {msg.blueprint.clips.length} SHOTS
                      </span>
                    </div>

                    {/* Sequential Clip Timeline */}
                    <div className="space-y-3 relative before:absolute before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-dark-border">
                      {msg.blueprint.clips.map((clip) => {
                        // Detect assets dynamically from the clip prompt and sort them by appearance order
                        const referencedAssets: Array<{ id: string; name: string; type: "Personaje" | "Prop" | "Locación"; imageUrl: string; handle: string; index: number }> = [];
                        
                        const getMinIndex = (nameStr: string): number => {
                          const handle = `@${nameStr.replace(/[^a-zA-Z0-9]/g, "")}`.toLowerCase();
                          const plain = nameStr.toLowerCase();
                          const handleIdx = clip.prompt.toLowerCase().indexOf(handle);
                          const plainIdx = clip.prompt.toLowerCase().indexOf(plain);
                          if (handleIdx !== -1 && plainIdx !== -1) return Math.min(handleIdx, plainIdx);
                          if (handleIdx !== -1) return handleIdx;
                          if (plainIdx !== -1) return plainIdx;
                          return -1;
                        };

                        characters.forEach(c => {
                          const idx = getMinIndex(c.name);
                          if (idx !== -1 && c.avatarUrl) {
                            if (!referencedAssets.some(item => item.imageUrl === c.avatarUrl)) {
                              referencedAssets.push({
                                id: c.id,
                                name: c.name,
                                type: "Personaje",
                                imageUrl: c.avatarUrl,
                                handle: `@${c.name.replace(/[^a-zA-Z0-9]/g, "")}`,
                                index: idx
                              });
                            }
                          }
                        });

                        props.forEach(p => {
                          const idx = getMinIndex(p.name);
                          if (idx !== -1 && p.imageUrl) {
                            if (!referencedAssets.some(item => item.imageUrl === p.imageUrl)) {
                              referencedAssets.push({
                                id: p.id,
                                name: p.name,
                                type: "Prop",
                                imageUrl: p.imageUrl,
                                handle: `@${p.name.replace(/[^a-zA-Z0-9]/g, "")}`,
                                index: idx
                              });
                            }
                          }
                        });

                        locations.forEach(l => {
                          const idx = getMinIndex(l.name);
                          if (idx !== -1 && l.imageUrl) {
                            if (!referencedAssets.some(item => item.imageUrl === l.imageUrl)) {
                              referencedAssets.push({
                                id: l.id,
                                name: l.name,
                                type: "Locación",
                                imageUrl: l.imageUrl,
                                handle: `@${l.name.replace(/[^a-zA-Z0-9]/g, "")}`,
                                index: idx
                              });
                            }
                          }
                        });

                        // Sort referenced assets by appearance order in the prompt
                        referencedAssets.sort((a, b) => a.index - b.index);

                        // If clip.image_urls is undefined or null, initialize it using the first 9 detected reference assets
                        if (clip.image_urls === undefined || clip.image_urls === null) {
                          clip.image_urls = referencedAssets.slice(0, 9).map(a => a.imageUrl);
                        }

                        // Filter out custom URLs that don't match any referenced assets from library
                        const customImageUrls = (clip.image_urls || []).filter(
                          url => !referencedAssets.some(asset => asset.imageUrl === url)
                        );

                        return (
                          <div key={clip.clipNumber} className="relative pl-8 space-y-1.5 group/clip">
                            {/* Timeline dot */}
                            <div className="absolute left-1.5 top-1.5 w-4 h-4 bg-orange-500/20 border border-orange-500/40 rounded-full flex items-center justify-center font-mono text-[8px] text-orange-300 font-extrabold group-hover/clip:bg-orange-500 group-hover/clip:text-black transition-all">
                              {clip.clipNumber}
                            </div>

                            {/* Clip details */}
                            <div className="p-3 bg-dark-input/50 border border-dark-border hover:border-orange-500/20 rounded-lg space-y-2 transition-all">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-200">
                                  {clip.title}
                                </span>
                                <span className="text-[9px] font-mono text-[#71717A]">
                                  {clip.duration}s {clip.generate_audio && "• Audio"}
                                </span>
                              </div>

                              {/* Editable Visual Screenplay (Prompt) */}
                              <div className="space-y-1">
                                <span className="text-[8px] font-mono uppercase tracking-wider text-orange-400/70 block">
                                  Guion Visual (Prompt del Clip):
                                </span>
                                <textarea
                                  value={clip.prompt}
                                  onChange={(e) => {
                                    clip.prompt = e.target.value;
                                    setMessages([...messages]);
                                  }}
                                  className="w-full bg-[#050506]/60 border border-dark-border/40 hover:border-orange-500/30 focus:border-orange-500/50 rounded-lg p-2 text-[11px] text-[#E4E4E7] leading-relaxed font-sans focus:outline-none resize-y min-h-[60px]"
                                  placeholder="Describe las acciones visuales de este clip..."
                                />
                              </div>

                              {/* Simple inline replace helper if there are handles in the clip's prompt */}
                              {(() => {
                                const clipHandles: string[] = Array.from(new Set(clip.prompt.match(/@\w+/g) || [])) as string[];
                                if (clipHandles.length === 0) return null;
                                return (
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1 bg-black/35 p-1.5 rounded-lg border border-dark-border/30">
                                    <span className="text-[#71717A] text-[8px] font-mono uppercase">Reemplazar en este clip:</span>
                                    {clipHandles.map(handle => (
                                      <div key={handle} className="flex items-center space-x-1 bg-[#1a1b1f] px-1.5 py-0.5 rounded border border-dark-border/50">
                                        <span className="text-orange-400 font-mono text-[9px] font-semibold">{handle}</span>
                                        <span className="text-[#71717A] text-[8px]">→</span>
                                        <select
                                          onChange={(e) => {
                                            const replacement = e.target.value;
                                            if (replacement) {
                                              const escaped = handle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                                              const regex = new RegExp(escaped, "g");
                                              clip.prompt = clip.prompt.replace(regex, replacement);
                                              setMessages([...messages]);
                                              e.target.value = "";
                                            }
                                          }}
                                          className="bg-transparent border-none text-[9px] text-slate-300 font-medium focus:ring-0 focus:outline-none p-0 cursor-pointer"
                                          defaultValue=""
                                        >
                                          <option value="" disabled className="bg-[#18181b] text-gray-500">Cambiar por...</option>
                                          {characters.map(c => {
                                            const charHandle = `@${c.name.replace(/[^a-zA-Z0-9]/g, "")}`;
                                            if (charHandle === handle) return null;
                                            return <option key={c.id} value={charHandle} className="bg-[#18181b] text-slate-200">{c.name}</option>;
                                          })}
                                          {props.map(p => {
                                            const propHandle = `@${p.name.replace(/[^a-zA-Z0-9]/g, "")}`;
                                            if (propHandle === handle) return null;
                                            return <option key={p.id} value={propHandle} className="bg-[#18181b] text-slate-200">{p.name}</option>;
                                          })}
                                          {locations.map(l => {
                                            const locHandle = `@${l.name.replace(/[^a-zA-Z0-9]/g, "")}`;
                                            if (locHandle === handle) return null;
                                            return <option key={l.id} value={locHandle} className="bg-[#18181b] text-slate-200">{l.name}</option>;
                                          })}
                                        </select>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}

                              {/* Camera Movement Badge Summary */}
                              <div className="flex flex-wrap gap-1">
                                <span className="text-[8px] font-mono bg-[#1F1F23] border border-[#3F3F46] px-1 rounded text-[#71717A]">
                                  Style: {clip.cameraSettings.style}
                                </span>
                                {clip.cameraSettings.pan !== "none" && (
                                  <span className="text-[8px] font-mono bg-orange-500/10 border border-orange-500/20 px-1 rounded text-orange-400">
                                    Pan: {clip.cameraSettings.pan}
                                  </span>
                                )}
                                {clip.cameraSettings.tilt !== "none" && (
                                  <span className="text-[8px] font-mono bg-orange-500/10 border border-orange-500/20 px-1 rounded text-orange-400">
                                    Tilt: {clip.cameraSettings.tilt}
                                  </span>
                                )}
                                {clip.cameraSettings.zoom !== "none" && (
                                  <span className="text-[8px] font-mono bg-orange-500/10 border border-orange-500/20 px-1 rounded text-orange-400">
                                    Zoom: {clip.cameraSettings.zoom}
                                  </span>
                                )}
                              </div>

                              {/* Continuity Notes */}
                              <div className="text-[9px] text-[#71717A] leading-normal italic border-l border-orange-500/20 pl-2">
                                {clip.consistencyExplanation}
                              </div>

                              {/* Reference Images for Context Consistency */}
                              <div className="space-y-2 pt-2 border-t border-dark-border/20">
                                <span className="text-[8px] font-mono uppercase tracking-wider text-[#71717A] block">
                                  Contexto de Consistencia de Escena (Máx. 3 de Seedance):
                                </span>
                                
                                {/* Elementos detectados en el guion */}
                                {referencedAssets.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[7px] font-mono text-orange-400/70 uppercase tracking-wider block">
                                      Elementos detectados en el Guion:
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {referencedAssets.map((asset) => {
                                        const isActive = (clip.image_urls || []).includes(asset.imageUrl);
                                        return (
                                          <button
                                            type="button"
                                            key={asset.id}
                                            onClick={() => {
                                              const currentUrls = clip.image_urls || [];
                                              if (isActive) {
                                                clip.image_urls = currentUrls.filter(url => url !== asset.imageUrl);
                                              } else {
                                                if (currentUrls.length >= 3) {
                                                  // Auto-desactiva la primera para hacer espacio
                                                  clip.image_urls = [...currentUrls.slice(1), asset.imageUrl];
                                                } else {
                                                  clip.image_urls = [...currentUrls, asset.imageUrl];
                                                }
                                              }
                                              setMessages([...messages]);
                                            }}
                                            className={`relative flex items-center p-1 rounded-lg border transition-all text-left bg-[#101114]/60 max-w-[140px] cursor-pointer ${
                                              isActive 
                                                ? "border-orange-500/60 shadow-[0_0_8px_rgba(249,115,22,0.15)] opacity-100" 
                                                : "border-dark-border/40 opacity-40 hover:opacity-75"
                                            }`}
                                            title={isActive ? "Contexto Activo (Presiona para desactivar)" : "Contexto Inactivo (Presiona para activar)"}
                                          >
                                            <div className="w-8 h-8 rounded overflow-hidden bg-black/40 border border-dark-border/40 shrink-0">
                                              <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            </div>
                                            <div className="ml-1.5 min-w-0 pr-1 flex flex-col justify-center">
                                              <span className="text-[7px] font-extrabold uppercase text-orange-400 leading-none tracking-wider">{asset.type}</span>
                                              <span className="text-[9px] text-white font-medium truncate mt-0.5">{asset.handle}</span>
                                            </div>
                                            {isActive && (
                                              <div className="absolute -top-1 -right-1 bg-orange-500 text-black rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold text-[8px] border border-black shadow">
                                                ✓
                                              </div>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Referencias personalizadas / subidas por el usuario */}
                                <div className="space-y-1">
                                  {(customImageUrls.length > 0 || referencedAssets.length === 0) && (
                                    <span className="text-[7px] font-mono text-[#71717A] uppercase tracking-wider block mt-1">
                                      Fotogramas Adicionales / Personalizados:
                                    </span>
                                  )}
                                  <div className="flex flex-wrap gap-2 items-center">
                                    {customImageUrls.map((url, uidx) => (
                                      <div key={uidx} className="relative group/thumb w-12 h-12 rounded border border-orange-500/30 overflow-hidden bg-black/40 shadow-sm">
                                        <img src={url} alt="Custom ref frame" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            clip.image_urls = (clip.image_urls || []).filter((u) => u !== url);
                                            setMessages([...messages]);
                                          }}
                                          className="absolute inset-0 bg-black/80 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-rose-400 font-bold text-[10px] transition-opacity cursor-pointer"
                                          title="Eliminar referencia"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}

                                    {/* Add Reference image dropdown */}
                                    <details className="relative group/addref">
                                      <summary className="list-none cursor-pointer p-1 rounded bg-[#1F1F23] hover:bg-[#27272A] border border-[#3F3F46] text-slate-300 text-[10px] font-mono flex items-center justify-center h-12 w-12" title="Agregar fotograma de referencia">
                                        <Plus className="w-4 h-4 text-orange-400" />
                                      </summary>
                                      <div className="absolute z-50 bottom-full left-0 mb-1 w-48 bg-[#18181B] border border-[#27272A] rounded-lg shadow-2xl p-2 space-y-1.5 max-h-40 overflow-y-auto">
                                        <span className="text-[9px] font-bold text-slate-300 block border-b border-[#27272A] pb-1">Seleccionar de Materiales:</span>
                                        {referenceFrames && referenceFrames.length > 0 ? (
                                          referenceFrames.map((rf) => (
                                            <button
                                              key={rf.id}
                                              type="button"
                                              onClick={() => {
                                                const currentUrls = clip.image_urls || [];
                                                if (currentUrls.includes(rf.imageUrl)) return;
                                                if (currentUrls.length >= 3) {
                                                  // Auto-desactiva el primero de la lista para hacer espacio
                                                  clip.image_urls = [...currentUrls.slice(1), rf.imageUrl];
                                                } else {
                                                  clip.image_urls = [...currentUrls, rf.imageUrl];
                                                }
                                                setMessages([...messages]);
                                              }}
                                              className="w-full text-left p-1 text-[9px] hover:bg-orange-500/10 hover:text-orange-300 rounded flex items-center gap-1 cursor-pointer truncate"
                                            >
                                              <img src={rf.imageUrl} className="w-4 h-4 object-cover rounded" referrerPolicy="no-referrer" />
                                              <span className="truncate">{rf.name}</span>
                                            </button>
                                          ))
                                        ) : (
                                          <span className="text-[8px] text-[#71717A] block">No hay fotogramas en Materiales.</span>
                                        )}

                                        <div className="border-t border-[#27272A] pt-1.5 mt-1 space-y-1">
                                          <span className="text-[8px] text-[#71717A] block">Pegar URL personalizada:</span>
                                          <input
                                            type="url"
                                            placeholder="https://..."
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                const target = e.currentTarget;
                                                const url = target.value.trim();
                                                if (url) {
                                                  const currentUrls = clip.image_urls || [];
                                                  if (currentUrls.length >= 3) {
                                                    clip.image_urls = [...currentUrls.slice(1), url];
                                                  } else {
                                                    clip.image_urls = [...currentUrls, url];
                                                  }
                                                  setMessages([...messages]);
                                                  target.value = "";
                                                }
                                              }
                                            }}
                                            className="w-full bg-black border border-[#27272A] rounded px-1.5 py-1 text-[9px] text-[#E4E4E7] focus:outline-none focus:border-orange-500/50"
                                          />
                                        </div>
                                      </div>
                                    </details>
                                  </div>
                                </div>
                              </div>

                              {/* Actions per clip */}
                              <div className="flex items-center space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={() => onLoadClipConfig(clip)}
                                className="flex-1 flex items-center justify-center space-x-1 py-1 px-2 bg-[#1F1F23] hover:bg-[#27272A] border border-[#3F3F46] hover:border-orange-500/20 rounded text-[9px] font-bold text-slate-300 transition-all"
                                title="Load settings into primary composer"
                              >
                                <ChevronRight className="w-3 h-3 text-orange-400" />
                                <span>Tweak in Composer</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onRenderClip(clip, msg.blueprint, renderResolution)}
                                className="flex-1 flex items-center justify-center space-x-1 py-1 px-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 rounded text-[9px] font-bold transition-all"
                              >
                                <Video className="w-3 h-3 text-orange-400" />
                                <span>Render Shot</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {isSequentiallyRendering && sequentialRenderProgress && (
                      <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2.5 animate-pulse">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-extrabold text-blue-400 flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Renderizando Secuencia con Continuidad...
                          </span>
                          <span className="font-mono text-slate-400 font-bold">
                            {sequentialRenderProgress.current} / {sequentialRenderProgress.total}
                          </span>
                        </div>
                        <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-dark-border">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${(sequentialRenderProgress.current / sequentialRenderProgress.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-[#A1A1AA] leading-relaxed font-mono">
                          {sequentialRenderProgress.status}
                        </p>
                      </div>
                    )}

                    {/* Resolution Switcher */}
                    <div className="flex items-center justify-between p-2.5 bg-[#1F1F23]/60 border border-[#3F3F46]/60 rounded-xl mb-1.5 mt-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Resolución de Ejecución:</span>
                      </div>
                      <div className="flex bg-[#050506] border border-[#27272A] rounded-lg p-0.5" id="director-resolution-selector">
                        <button
                          type="button"
                          onClick={() => setRenderResolution("720p")}
                          className={`px-2.5 py-1 rounded text-[9px] font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
                            renderResolution === "720p"
                              ? "bg-[#d1f025] text-black shadow-md"
                              : "text-[#71717A] hover:text-slate-300"
                          }`}
                        >
                          720p
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenderResolution("1080p")}
                          className={`px-2.5 py-1 rounded text-[9px] font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
                            renderResolution === "1080p"
                              ? "bg-[#d1f025] text-black shadow-md"
                              : "text-[#71717A] hover:text-slate-300"
                          }`}
                        >
                          1080p
                        </button>
                      </div>
                    </div>

                    {/* Master Actions */}
                    <div className="pt-1 space-y-2">
                      <button
                        type="button"
                        onClick={() => onRenderSceneSequentially ? onRenderSceneSequentially(msg.blueprint!, renderResolution) : onRenderScene(msg.blueprint!, renderResolution)}
                        disabled={isSequentiallyRendering}
                        className="w-full py-2.5 bg-[#d1f025] hover:bg-[#b8d61e] disabled:bg-slate-700 disabled:cursor-not-allowed text-black font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-black/10 cursor-pointer"
                      >
                        <Clapperboard className="w-3.5 h-3.5 text-black" />
                        <span>Renderizar Escena Secuencial con Continuidad (Clip a Clip)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRenderScene(msg.blueprint!, renderResolution)}
                        disabled={isSequentiallyRendering}
                        className="w-full py-2 bg-[#1F1F23] hover:bg-[#27272A] border border-[#3F3F46] hover:border-orange-500/30 disabled:opacity-50 text-slate-300 font-extrabold rounded-lg text-[9px] tracking-wider uppercase transition-all flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Renderizar Todo en Paralelo (Sin Espera de Continuidad)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loader State */}
        {loading && (
          <div className="flex flex-col items-start space-y-1 animate-pulse">
            <div className="flex items-center space-x-1.5 text-[9px] text-[#71717A] font-mono px-1">
              <span>AI CINEMATIC DIRECTOR</span>
              <span>•</span>
              <span>Composing...</span>
            </div>
            <div className="p-4 bg-orange-950/10 border border-orange-900/10 rounded-xl rounded-tl-none text-xs text-slate-300 max-w-[85%] space-y-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                <span className="font-semibold text-orange-400 uppercase tracking-wider text-[10px]">{loadingStep}</span>
              </div>
              <p className="text-[#71717A] italic leading-relaxed">
                Writing script blueprint, generating consistent camera paths, and aligning casting parameters...
              </p>
            </div>
          </div>
        )}

        {/* Local Error message */}
        {error && (
          <div className="p-3.5 bg-rose-500/5 border border-rose-500/15 rounded-xl text-rose-400 text-xs space-y-2">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-bold">Director bloqueado / error del modelo:</p>
                <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">{error}</p>
              </div>
            </div>
            {lastRequest && (
              <div className="pt-2 border-t border-rose-500/10 flex justify-end">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={loading}
                  className="px-3 py-1.5 bg-[#d1f025] hover:brightness-110 active:scale-95 text-black font-extrabold rounded-lg text-[10px] tracking-wide uppercase transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-black animate-none" />
                  <span>Reintentar Generación</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Casting Injector tags */}
      <div className="space-y-1 mb-2">
        <span className="text-[9px] text-[#71717A] uppercase tracking-wider block">Tag injection:</span>
        <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto pr-1">
          {characters.map(c => (
            <button
              key={c.id}
              onClick={() => insertAsset(`@${c.name}`)}
              className="text-[9px] bg-[#1F1F23] hover:bg-orange-500/15 hover:text-orange-400 border border-[#3F3F46] rounded px-1.5 py-0.5 text-[#71717A] transition-all"
            >
              👤 @{c.name}
            </button>
          ))}
          {locations.map(l => (
            <button
              key={l.id}
              onClick={() => insertAsset(`@${l.name}`)}
              className="text-[9px] bg-[#1F1F23] hover:bg-orange-500/15 hover:text-orange-400 border border-[#3F3F46] rounded px-1.5 py-0.5 text-[#71717A] transition-all"
            >
              📍 @{l.name}
            </button>
          ))}
          {props.map(p => (
            <button
              key={p.id}
              onClick={() => insertAsset(`@${p.name}`)}
              className="text-[9px] bg-[#1F1F23] hover:bg-orange-500/15 hover:text-orange-400 border border-[#3F3F46] rounded px-1.5 py-0.5 text-[#71717A] transition-all"
            >
              ✨ @{p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Attached images preview area */}
      {attachedImageUrls.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-[#050506]/60 border border-dark-border rounded-lg mb-2">
          {attachedImageUrls.map((url, i) => (
            <div key={i} className="relative w-12 h-12 rounded border border-[#d1f025]/40 overflow-hidden group bg-black">
              <img src={url} alt="Adjunto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button
                type="button"
                onClick={() => setAttachedImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 text-[10px] font-bold transition-opacity cursor-pointer"
              >
                Borrar
              </button>
            </div>
          ))}
        </div>
      )}

      {isUploadingImage && (
        <div className="flex items-center space-x-1.5 text-[9px] text-[#d1f025] font-bold animate-pulse mb-2 px-1">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Subiendo imagen de referencia al Director...</span>
        </div>
      )}
      {imageUploadError && (
        <div className="text-[9px] text-rose-400 font-bold mb-2 px-1">
          ⚠️ {imageUploadError}
        </div>
      )}

      {/* Input area */}
      <input 
        type="file" 
        ref={chatFileInputRef} 
        onChange={handleChatImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      <form onSubmit={handleSend} className="flex gap-2">
        <button
          type="button"
          disabled={loading || isUploadingImage}
          onClick={() => chatFileInputRef.current?.click()}
          className="px-2.5 py-2 bg-dark-border hover:bg-[#27272A] border border-[#3F3F46] hover:border-[#d1f025]/40 rounded-lg text-xs text-[#E4E4E7] transition-all flex items-center justify-center cursor-pointer shrink-0"
          title="Adjuntar Imagen de Referencia / Contexto"
        >
          <Plus className="w-4 h-4 text-[#d1f025]" />
          <span className="sr-only">Adjuntar Imagen</span>
        </button>

        <input
          id="director-prompt-input"
          type="text"
          disabled={loading}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={hasGeminiKey ? "Describe la visión del clip creativo o escena..." : "Configura tu GEMINI_API_KEY en Secrets primero"}
          className="flex-1 px-3 py-2 bg-[#050506] border border-dark-border rounded-lg text-xs text-slate-100 placeholder-[#3F3F46] focus:outline-none focus:border-[#d1f025]/50 shadow-inner disabled:opacity-50"
        />
        <button
          id="btn-director-send"
          type="submit"
          disabled={loading || !inputText.trim() || !hasGeminiKey}
          className={`px-3 py-2 rounded-lg text-black font-extrabold cursor-pointer transition-all ${
            !inputText.trim() || loading || !hasGeminiKey
              ? "bg-dark-border text-[#71717A] cursor-not-allowed border border-[#3F3F46]"
              : "bg-[#d1f025] hover:brightness-110 active:scale-95 text-black"
          }`}
        >
          <Send className="w-4 h-4 text-black" />
        </button>
      </form>
      
      {!hasGeminiKey && (
        <p className="text-[9px] text-[#71717A] mt-2 text-center animate-pulse">
          ⚠️ AI Director requires a <strong>GEMINI_API_KEY</strong> set in Settings &gt; Secrets.
        </p>
      )}
    </div>
  );
}
