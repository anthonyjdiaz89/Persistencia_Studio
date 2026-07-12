/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  CharacterAsset, 
  PropAsset, 
  LocationAsset, 
  CameraSettings, 
  GenerationMode, 
  AspectRatio, 
  Resolution,
  GenerationInput,
  VideoTask
} from "../types";
import { 
  Sparkles, 
  Film, 
  Clock, 
  Sliders, 
  Eye, 
  AlertTriangle,
  Key,
  Database,
  Volume2,
  VolumeX,
  Check,
  ImageIcon,
  Plus,
  Play,
  RotateCcw,
  RefreshCw,
  Cpu,
  Monitor,
  LayoutGrid,
  Upload,
  AlertCircle
} from "lucide-react";
import { compileFinalPrompt, getAssetHandle } from "../utils";
import { uploadImageToSupabase } from "../lib/firebase";

export const MODELS_LIST = [
  { id: "seedance-25", name: "Seedance 2.5", badge: "Destacado", desc: "Diseñado para crear videos cinematográficos de alta calidad con movimiento avanzado, fuerte continuidad y control creativo profesional.", cost: "720p-1080p | 5-30s" },
  { id: "sora-2", name: "Sora 2 (OpenAI)", badge: "Física", desc: "El mejor modelo para generar videos y audio altamente realistas con simulaciones físicas precisas y diálogo sincronizado.", cost: "1080p | 10s" },
  { id: "veo-31", name: "Veo 3.1 Fast", badge: "Premium", desc: "Modelo de vanguardia de Google que ofrece detalles hiperrealistas y control creativo mejorado para visuales deslumbrantes.", cost: "720p-1080p | 8s" },
  { id: "veo3", name: "Veo 3 Fast", badge: "Premium", desc: "El modelo de generación de video más avanzado de Google con calidad inigualable e increíbles detalles.", cost: "720p-1080p | 8s" },
  { id: "kling-3", name: "Kling 3", badge: "Fama", desc: "Generación de video de primer nivel con fluidez de movimiento inigualable, visuales cinematográficos y precisión de prompt excepcional.", cost: "720p-1080p | 5-10s" },
  { id: "gemini-omni", name: "Gemini Omni", badge: "Google", desc: "Combina la física avanzada con el conocimiento de ciencia, historia y contexto cultural de Gemini para videos realistas.", cost: "720p-1080p | 4-10s" },
  { id: "higgsfield_v1", name: "Higgsfield", badge: "Movimiento", desc: "Modelo de IA avanzado con excelente comprensión del movimiento y rendimiento fotorrealista para escenas cinematográficas.", cost: "720p-1080p | 5-15s" },
  { id: "wan-25", name: "Wan 2.5", badge: "Abierto", desc: "Modelo de IA de código abierto capaz de generar automáticamente videos altamente realistas con audio incorporado.", cost: "720p-1080p | 5-10s" },
  { id: "grok-imagine-1-5", name: "Grok Imagine 1.5", badge: "xAI", desc: "Modelo de video Grok de xAI, rápido y de alta fidelidad, excelente para prototipado rápido y experimentación creativa.", cost: "720p-1080p | 5-10s" },
  { id: "seedance-2", name: "Seedance 2 Pro", badge: "Rápido", desc: "Modelo ultrarrápido ideal para experimentación creativa rápida y composición ágil.", cost: "720p-1080p | 5-10s" },
  { id: "seedance-2-mini", name: "Seedance 2.0 Mini", badge: "Lite", desc: "Modelo ligero construido para la creación rápida y controlable de videos de formato corto con movimiento suave.", cost: "720p-1080p | 5-15s" },
  { id: "ltxv-2", name: "LTV Video 2", badge: "4K", desc: "Crea videos y audio de alta fidelidad a partir de texto con el nuevo modelo abierto LTXV 2.", cost: "1080p-4K | 6-10s" },
  { id: "nanobanana-video", name: "Nano Banana", badge: "Divertido", desc: "Modelo liviano para generación rápida de videos creativos. Perfecto para clips cortos.", cost: "480p-720p | 5-10s" },
  { id: "veo2", name: "Veo 2", badge: "Google", desc: "Desarrollado por Google, ideal para generar videos altamente realistas con simulación física sólida.", cost: "720p-1080p | 10s" },
  { id: "ltxv-13b", name: "LTX-Video 13B", badge: "LTX", desc: "Modelo LTX-Video abierto para control y adaptabilidad en resoluciones optimizadas.", cost: "480p | 1-60s" }
];

export interface ModelSpec {
  id: string;
  name: string;
  resolutions: ("480p" | "720p" | "1080p" | "4k")[];
  defaultResolution: "480p" | "720p" | "1080p" | "4k";
  durations: number[];
  defaultDuration: number;
}

export const MODEL_SPECS: Record<string, ModelSpec> = {
  "seedance-25": {
    id: "seedance-25",
    name: "Seedance 2.5",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [5, 10, 15, 20, 30],
    defaultDuration: 15
  },
  "sora-2": {
    id: "sora-2",
    name: "Sora 2 (OpenAI)",
    resolutions: ["1080p"],
    defaultResolution: "1080p",
    durations: [10],
    defaultDuration: 10
  },
  "veo-31": {
    id: "veo-31",
    name: "Veo 3.1 Fast",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [8],
    defaultDuration: 8
  },
  "veo3": {
    id: "veo3",
    name: "Veo 3 Fast",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [8],
    defaultDuration: 8
  },
  "kling-3": {
    id: "kling-3",
    name: "Kling 3",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [5, 10],
    defaultDuration: 10
  },
  "gemini-omni": {
    id: "gemini-omni",
    name: "Gemini Omni",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [4, 5, 8, 10],
    defaultDuration: 5
  },
  "higgsfield_v1": {
    id: "higgsfield_v1",
    name: "Higgsfield",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [5, 10, 15],
    defaultDuration: 10
  },
  "wan-25": {
    id: "wan-25",
    name: "Wan 2.5",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [5, 10],
    defaultDuration: 5
  },
  "grok-imagine-1-5": {
    id: "grok-imagine-1-5",
    name: "Grok Imagine 1.5",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [5, 10],
    defaultDuration: 5
  },
  "seedance-2": {
    id: "seedance-2",
    name: "Seedance 2 Pro",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [5, 10],
    defaultDuration: 5
  },
  "seedance-2-mini": {
    id: "seedance-2-mini",
    name: "Seedance 2.0 Mini",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [5, 10, 15],
    defaultDuration: 5
  },
  "ltxv-2": {
    id: "ltxv-2",
    name: "LTV Video 2",
    resolutions: ["1080p", "4k"],
    defaultResolution: "4k",
    durations: [6, 8, 10],
    defaultDuration: 6
  },
  "nanobanana-video": {
    id: "nanobanana-video",
    name: "Nano Banana",
    resolutions: ["480p", "720p"],
    defaultResolution: "720p",
    durations: [5, 10],
    defaultDuration: 5
  },
  "veo2": {
    id: "veo2",
    name: "Veo 2",
    resolutions: ["720p", "1080p"],
    defaultResolution: "1080p",
    durations: [10],
    defaultDuration: 10
  },
  "ltxv-13b": {
    id: "ltxv-13b",
    name: "LTX-Video 13B",
    resolutions: ["480p"],
    defaultResolution: "480p",
    durations: [1, 5, 10, 15, 30, 45, 60],
    defaultDuration: 5
  }
};

const normalizeAspectRatio = (value?: string): AspectRatio => {
  if (!value) return "16:9";
  const v = value.trim();
  if (v === "16:9" || v === "4:3" || v === "1:1" || v === "9:21") return v;
  if (v === "9:16") return "9:21";
  if (v === "3:4") return "4:3";
  return "16:9";
};

interface PromptBuilderPanelProps {
  characters: CharacterAsset[];
  props: PropAsset[];
  locations: LocationAsset[];
  cameraSettings: CameraSettings;
  onCameraSettingsChange: (settings: CameraSettings) => void;
  
  promptText: string;
  setPromptText: (text: string) => void;
  
  apiKey: string;
  setApiKey: (key: string) => void;
  hasEnvApiKey: boolean;
  showApiKeyPanel: boolean;
  setShowApiKeyPanel: (val: boolean) => void;

  model: string;
  setModel: (model: string) => void;
  onGenerate: (input: GenerationInput, model: string) => void;
  isGenerating: boolean;
  lastUsedSeed: number;

  onOpenCameraSettings: () => void;
  completedVideos?: Array<{ id: string; url: string; prompt: string; sceneTitle?: string }>;

  activeReplayTask?: VideoTask | null;
  onClearReplayTask?: () => void;
  extractedRefImage?: string | null;
  onClearExtractedRefImage?: () => void;
  activeContextVideoUrl?: string | null;
  onClearActiveContextVideoUrl?: () => void;
}

export default function PromptBuilderPanel({
  characters,
  props,
  locations,
  cameraSettings,
  onCameraSettingsChange,
  promptText,
  setPromptText,
  apiKey,
  setApiKey,
  hasEnvApiKey,
  showApiKeyPanel,
  setShowApiKeyPanel,
  model,
  setModel,
  onGenerate,
  isGenerating,
  lastUsedSeed,
  onOpenCameraSettings,
  completedVideos = [],
  activeReplayTask = null,
  onClearReplayTask,
  extractedRefImage = null,
  onClearExtractedRefImage,
  activeContextVideoUrl = null,
  onClearActiveContextVideoUrl
}: PromptBuilderPanelProps) {
  const [generationType, setGenerationType] = useState<GenerationMode>("text-to-video");
  const [duration, setDuration] = useState<number>(15);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [resolution, setResolution] = useState<Resolution>("1080p");
  
  // Toggles
  const [generateAudio, setGenerateAudio] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [returnLastFrame, setReturnLastFrame] = useState(false);
  const [seed, setSeed] = useState<number>(-1);

  // Advanced toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Modals for visual selection in Spanish
  const [showTimeOfDayModal, setShowTimeOfDayModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  // Auto-complete dropdown for @ characters and casting assets
  const [showAtDropdown, setShowAtDropdown] = useState(false);
  const [atSearchQuery, setAtSearchQuery] = useState("");

  // Media Reference states
  const [refImageUrls, setRefImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Video reference for absolute sequence continuity
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");
  const [manualVideoUrl, setManualVideoUrl] = useState<string>("");

  // API Key Connection Validation states
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleValidateKey = async () => {
    setIsValidatingKey(true);
    setValidationStatus(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      const res = await fetch("/api/seedance/validate-key", {
        method: "POST",
        headers
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setValidationStatus({ success: true, message: data.message || "¡Conexión exitosa! Clave API válida." });
      } else {
        setValidationStatus({ success: false, message: data.message || "La clave de API no es válida o está inactiva." });
      }
    } catch (err: any) {
      setValidationStatus({ 
        success: false, 
        message: err.message || "Error al conectar con el servidor de validación." 
      });
    } finally {
      setIsValidatingKey(false);
    }
  };

  // Dynamically update available resolution/duration when selected model changes
  React.useEffect(() => {
    const spec = MODEL_SPECS[model] || MODEL_SPECS["seedance-25"];
    if (spec) {
      if (!spec.resolutions.includes(resolution as any)) {
        setResolution(spec.defaultResolution as any);
      }
      if (!spec.durations.includes(duration)) {
        setDuration(spec.defaultDuration);
      }
    }
  }, [model]);

  // Replay full task settings into Composer
  React.useEffect(() => {
    if (activeReplayTask && activeReplayTask.input) {
      const inp = activeReplayTask.input;
      setPromptText(inp.prompt || "");
      setGenerationType(inp.generation_type || "text-to-video");
      setDuration(inp.duration || 15);
      setAspectRatio(normalizeAspectRatio(inp.aspect_ratio));
      setResolution(inp.resolution || "1080p");
      setSeed(inp.seed !== undefined ? inp.seed : -1);
      
      if (inp.image_urls && Array.isArray(inp.image_urls)) {
        setRefImageUrls(inp.image_urls);
      } else {
        setRefImageUrls([]);
      }
      
      if (inp.video_urls && Array.isArray(inp.video_urls) && inp.video_urls.length > 0) {
        setSelectedVideoUrl(inp.video_urls[0]);
      } else {
        setSelectedVideoUrl("");
      }

      if (onClearReplayTask) {
        onClearReplayTask();
      }
    }
  }, [activeReplayTask, onClearReplayTask, setPromptText]);

  // Add extracted frame references from completed videos automatically
  React.useEffect(() => {
    if (extractedRefImage) {
      setRefImageUrls(prev => {
        if (prev.includes(extractedRefImage)) return prev;
        return [...prev, extractedRefImage];
      });
      setGenerationType("reference-to-video");
      if (onClearExtractedRefImage) {
        onClearExtractedRefImage();
      }
    }
  }, [extractedRefImage, onClearExtractedRefImage]);

  // Set video context from activeContextVideoUrl automatically
  React.useEffect(() => {
    if (activeContextVideoUrl) {
      setSelectedVideoUrl(activeContextVideoUrl);
      setManualVideoUrl("");
      setGenerationType("reference-to-video");
      if (onClearActiveContextVideoUrl) {
        onClearActiveContextVideoUrl();
      }
    }
  }, [activeContextVideoUrl, onClearActiveContextVideoUrl]);

  // Removed: resizeAndConvertToBase64 - now using direct Supabase Storage upload

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        try {
          setIsUploading(true);
          // Upload directly to Supabase Storage
          const imageUrl = await uploadImageToSupabase(file, "video-assets", "reference-images");
          
          // Add to reference images immediately
          if (!refImageUrls.includes(imageUrl)) {
            setRefImageUrls([...refImageUrls, imageUrl]);
          }
        } catch (err: any) {
          console.error("Upload error:", err);
          setUploadError("Fallo al subir la imagen a Supabase Storage.");
        } finally {
          setIsUploading(false);
        }
      } else {
        setUploadError("Por favor selecciona un archivo de imagen.");
      }
    }
  };

  // Automatically detect reference images only from explicit @handle mentions
  const detectedAssets: Array<{ name: string; type: string; imageUrl: string; index: number }> = [];
  
  const getMinIndex = (nameStr: string): number => {
    const handle = getAssetHandle(nameStr).toLowerCase();
    const handleIdx = promptText.toLowerCase().indexOf(handle);
    if (handleIdx !== -1) return handleIdx;
    return -1;
  };

  characters.forEach(c => {
    const idx = getMinIndex(c.name);
    if (idx !== -1 && c.avatarUrl) {
      if (!detectedAssets.some(a => a.imageUrl === c.avatarUrl)) {
        detectedAssets.push({ name: c.name, type: "Character", imageUrl: c.avatarUrl, index: idx });
      }
    }
  });
  props.forEach(p => {
    const idx = getMinIndex(p.name);
    if (idx !== -1 && p.imageUrl) {
      if (!detectedAssets.some(a => a.imageUrl === p.imageUrl)) {
        detectedAssets.push({ name: p.name, type: "Prop", imageUrl: p.imageUrl, index: idx });
      }
    }
  });
  locations.forEach(l => {
    const idx = getMinIndex(l.name);
    if (idx !== -1 && l.imageUrl) {
      if (!detectedAssets.some(a => a.imageUrl === l.imageUrl)) {
        detectedAssets.push({ name: l.name, type: "Location", imageUrl: l.imageUrl, index: idx });
      }
    }
  });

  // Sort detected assets by appearance order in the prompt
  detectedAssets.sort((a, b) => a.index - b.index);

  const combinedRefImages = [...refImageUrls];
  detectedAssets.forEach(asset => {
    if (!combinedRefImages.includes(asset.imageUrl)) {
      combinedRefImages.push(asset.imageUrl);
    }
  });

  const { compiled: compiledPrompt } = compileFinalPrompt(
    promptText,
    characters,
    props,
    locations,
    cameraSettings,
    combinedRefImages,
    !!(selectedVideoUrl || manualVideoUrl)
  );

  const hasReferenceContext = combinedRefImages.length > 0 || !!(selectedVideoUrl || manualVideoUrl);
  const specForModel = MODEL_SPECS[model] || MODEL_SPECS["seedance-25"];
  const allowedDurationsForContext =
    model === "seedance-25" && hasReferenceContext
      ? specForModel.durations.filter((d) => d <= 10)
      : specForModel.durations;

  React.useEffect(() => {
    if (!allowedDurationsForContext.includes(duration)) {
      const fallback = allowedDurationsForContext[allowedDurationsForContext.length - 1] || specForModel.defaultDuration;
      setDuration(fallback);
    }
  }, [duration, allowedDurationsForContext, specForModel.defaultDuration]);

  // Automatically update the generation mode select field to Multi-Reference ("reference-to-video") when a saved asset handle is typed
  React.useEffect(() => {
    if (detectedAssets.length > 0 && generationType !== "reference-to-video") {
      setGenerationType("reference-to-video");
    }
  }, [promptText, detectedAssets.length, generationType]);

  const handleAddRefImage = () => {
    if (!newImageUrl.trim()) return;
    if (!refImageUrls.includes(newImageUrl.trim())) {
      setRefImageUrls([...refImageUrls, newImageUrl.trim()]);
    }
    setNewImageUrl("");
  };

  const handleInsertBadge = (handle: string) => {
    if (promptText.trim()) {
      setPromptText(`${promptText} ${handle}`);
    } else {
      setPromptText(handle);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const selectionStart = e.target.selectionStart;
    setPromptText(value);

    // Find if the cursor is currently at or after an '@' character
    const textBeforeCursor = value.slice(0, selectionStart);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex !== -1 && !textBeforeCursor.slice(atIndex).includes(" ")) {
      // User is actively typing an asset tag
      setShowAtDropdown(true);
      setAtSearchQuery(textBeforeCursor.slice(atIndex + 1).toLowerCase());
    } else {
      setShowAtDropdown(false);
      setAtSearchQuery("");
    }
  };

  const handleSelectAssetAt = (name: string) => {
    const textarea = document.getElementById("prompt-textarea") as HTMLTextAreaElement;
    const value = promptText;
    const cursor = textarea ? textarea.selectionStart : value.length;
    
    // Find the '@' we are replacing
    const textBeforeCursor = value.slice(0, cursor);
    const textAfterCursor = value.slice(cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    let newVal = value;
    if (atIndex !== -1 && !textBeforeCursor.slice(atIndex).includes(" ")) {
      // Replace from atIndex to cursor with the new handle
      newVal = value.slice(0, atIndex) + `@${name} ` + textAfterCursor;
    } else {
      // Fallback
      newVal = value.slice(0, cursor) + `@${name} ` + textAfterCursor;
    }
    
    setPromptText(newVal);
    setShowAtDropdown(false);
    setAtSearchQuery("");
    
    // Refocus and place cursor after inserted text
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = atIndex !== -1 ? atIndex + name.length + 2 : cursor + name.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  const handleAtButtonClick = () => {
    const textarea = document.getElementById("prompt-textarea") as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
      const cursor = textarea.selectionStart;
      const value = promptText;
      const textBeforeCursor = value.slice(0, cursor);
      const textAfterCursor = value.slice(cursor);
      
      const newVal = textBeforeCursor + "@" + textAfterCursor;
      setPromptText(newVal);
      
      setTimeout(() => {
        textarea.setSelectionRange(cursor + 1, cursor + 1);
        setShowAtDropdown(true);
        setAtSearchQuery("");
      }, 50);
    } else {
      setPromptText(promptText + "@");
      setShowAtDropdown(true);
      setAtSearchQuery("");
    }
  };

  const allCastAssets = [
    ...characters.map(c => ({ ...c, type: "Personaje" })),
    ...props.map(p => ({ ...p, type: "Objeto" })),
    ...locations.map(l => ({ ...l, type: "Escenario" }))
  ];

  const filteredCastAssets = allCastAssets.filter(asset => 
    asset.name.toLowerCase().includes(atSearchQuery)
  );

  const handleGenerateClick = () => {
    let finalGenType = generationType;
    if (combinedRefImages.length > 0) {
      if (detectedAssets.length > 0 || combinedRefImages.length > 1) {
        finalGenType = "reference-to-video";
      } else if (finalGenType === "text-to-video") {
        finalGenType = "image-to-video";
      }
    }

    const activeVideoUrl = selectedVideoUrl || manualVideoUrl;
    const shouldForceTextOnlyForSeedance25 = model === "seedance-25" && duration > 10;
    const effectiveGenType = shouldForceTextOnlyForSeedance25
      ? "text-to-video"
      : (activeVideoUrl ? "reference-to-video" : finalGenType);
    const effectiveImageUrls = shouldForceTextOnlyForSeedance25 ? [] : combinedRefImages.slice(0, 9);
    const effectiveVideoUrls = shouldForceTextOnlyForSeedance25 || !activeVideoUrl ? [] : [activeVideoUrl];

    const inputPayload: GenerationInput = {
      prompt: compiledPrompt,
      generation_type: effectiveGenType,
      duration,
      aspect_ratio: aspectRatio,
      resolution,
      generate_audio: generateAudio,
      watermark,
      web_search: webSearch,
      return_last_frame: returnLastFrame,
      seed,
      ...(effectiveImageUrls.length > 0 ? { image_urls: effectiveImageUrls } : {}),
      ...(effectiveVideoUrls.length > 0 ? { video_urls: effectiveVideoUrls } : {})
    };

    onGenerate(inputPayload, model);
  };

  // Quick preset handles or image inserts
  const insertMockImage = (url: string) => {
    if (!refImageUrls.includes(url)) {
      setRefImageUrls([...refImageUrls, url]);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-4" id="multimodal-editor">
      {/* Quick Settings Pills (Floating layout above editor) */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-[-12px] relative z-20">
        <div 
          className="glass-panel px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium text-slate-300 shadow-lg border border-transparent"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500"></span>
          <span>Serie: <span className="text-[#d1f025] font-bold">Isla Magica</span></span>
        </div>

        <button 
          type="button"
          onClick={() => setShowTimeOfDayModal(true)}
          className="glass-panel px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg border border-transparent hover:border-[#454933]"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary-container" />
          <span>Horario: <span className="text-[#d1f025] font-bold">{{
            'dawn': 'Amanecer',
            'day': 'Día',
            'afternoon': 'Tarde',
            'sunset': 'Atardecer',
            'night': 'Noche'
          }[cameraSettings.timeOfDay]}</span></span>
        </button>

        <button 
          type="button"
          onClick={onOpenCameraSettings}
          className="glass-panel px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium text-[#d1f025] hover:text-white transition-all cursor-pointer shadow-lg border border-primary-container/30 hover:border-primary-container"
          id="cameraSettingsToggle"
        >
          <Film className="w-3.5 h-3.5 text-primary-container" />
          <span>Cámara: <span className="text-white font-bold">{cameraSettings.style.toUpperCase()} track</span></span>
        </button>

        {/* API Key status pill - Hidden: Keys now managed via .env multi-key system */}
      </div>

      {/* Main Glass-Panel Editor Box */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-[#454933]/30">
        
        {/* API Key Box - Hidden: Keys now managed via .env multi-key system */}
        {false && (
          <div className="p-4 bg-[#0d0e12] border-b border-[#454933]/30 space-y-3 animate-fade-in" id="seedance-key-manager">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-[#d1f025]" />
                <span className="text-[10px] font-bold text-gray-300 tracking-wider uppercase font-mono">Gestión de Claves (Seedance / VideoGenAPI)</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowApiKeyPanel(false)} 
                className="text-[9px] text-[#71717A] uppercase hover:text-white transition-colors"
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="password"
                  placeholder={hasEnvApiKey ? "ENV API KEY ACTIVE (lannetech_...)" : "Ingresa tu clave de API (lannetech_...)"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setValidationStatus(null); // Reset status on key change
                  }}
                  className="w-full bg-black border border-[#454933]/30 rounded-lg pl-3 pr-12 py-1.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#d1f025] transition-colors"
                />
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKey("");
                      setValidationStatus(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={isValidatingKey || (!apiKey && !hasEnvApiKey)}
                onClick={handleValidateKey}
                className="bg-[#d1f025] hover:bg-[#b8d41e] disabled:bg-[#d1f025]/20 disabled:text-gray-500 text-black px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
              >
                {isValidatingKey ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Validar Conexión</span>
                  </>
                )}
              </button>
            </div>

            {/* Validation feedback */}
            {validationStatus && (
              <div 
                className={`p-3 rounded-lg border flex items-start space-x-2 text-xs transition-all ${
                  validationStatus.success 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}
                id="api-key-validation-status"
              >
                {validationStatus.success ? (
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                )}
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">{validationStatus.success ? "Conexión Exitosa" : "Error de Conexión"}</p>
                  <p className="text-[11px] leading-relaxed opacity-90">{validationStatus.message}</p>
                </div>
              </div>
            )}

            <div className="text-[11px] text-gray-400 leading-relaxed bg-[#16181d] p-2.5 rounded-lg border border-[#454933]/10">
              <p className="font-medium text-amber-400/90 mb-1">💡 ¿Cómo funciona?</p>
              <p>
                Esta herramienta valida tu clave directamente contra el servidor de VideoGenAPI sin consumir créditos. 
                Las claves válidas de VideoGenAPI usualmente comienzan con <code className="text-[#d1f025] font-mono select-all font-bold">lannetech_</code> o <code className="text-[#d1f025] font-mono select-all font-bold">seedance_</code>. 
                Consigue una en{" "}
                <a 
                  href="https://videogenapi.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#d1f025] underline hover:text-white transition-colors font-semibold font-sans"
                >
                  VideoGenAPI.com
                </a>.
              </p>
            </div>
          </div>
        )}

        {/* Top Reference Desk Area */}
        <div className="px-4 pt-4 flex flex-wrap items-center gap-2.5">
          {/* File Input for uploading images */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
          />

          {isUploading && (
            <div className="px-2.5 py-1.5 bg-[#d1f025]/10 border border-[#d1f025]/30 rounded-lg text-[10px] text-white flex items-center gap-1.5 transition-all font-bold animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin text-[#d1f025]" />
              <span>Subiendo...</span>
            </div>
          )}

          {/* Reference Images Counter */}
          {combinedRefImages.length > 0 && (
            <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border ${
              combinedRefImages.length > 5 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                : 'bg-[#d1f025]/10 border-[#d1f025]/30 text-[#d1f025]'
            }`}>
              <ImageIcon className="w-3 h-3" />
              <span>
                {Math.min(combinedRefImages.length, 5)}/5 imágenes activas
                {combinedRefImages.length > 5 && (
                  <span className="text-amber-400 ml-1">({combinedRefImages.length - 5} ignoradas)</span>
                )}
              </span>
            </div>
          )}

          {/* Video Reference / Continuity Control */}
          <div className="flex items-center gap-2 bg-[#18191e] border border-[#d1f025]/25 rounded-lg p-1.5 shadow-sm">
            <Film className="w-3.5 h-3.5 text-[#d1f025]" />
            <span className="text-[10px] font-black uppercase text-[#d1f025] tracking-wider font-mono">Continuidad:</span>
            
            {(selectedVideoUrl || manualVideoUrl) ? (
              <div className="flex items-center gap-1.5 bg-[#d1f025]/10 text-[#d1f025] px-2 py-0.5 rounded text-[10px] font-bold border border-[#d1f025]/20">
                <span className="truncate max-w-[140px] font-mono">
                  {selectedVideoUrl ? `Video anterior (${selectedVideoUrl.slice(-12)})` : `Manual (${manualVideoUrl.slice(-12)})`}
                </span>
                <button 
                  type="button" 
                  onClick={() => { setSelectedVideoUrl(""); setManualVideoUrl(""); }}
                  className="text-rose-400 hover:text-rose-300 font-extrabold ml-1 cursor-pointer scale-110"
                  title="Eliminar continuidad"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {completedVideos.length > 0 ? (
                  <select
                    value={selectedVideoUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedVideoUrl(val);
                      if (val) setManualVideoUrl("");
                    }}
                    className="bg-black border border-[#454933]/40 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-[#d1f025]"
                  >
                    <option value="">-- Cargar Video Anterior --</option>
                    {completedVideos.map((vid, idx) => (
                      <option key={vid.id} value={vid.url}>
                        Shot {idx + 1}: {vid.prompt ? (vid.prompt.length > 25 ? vid.prompt.slice(0, 25) + "..." : vid.prompt) : `Task ${vid.id.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] text-[#71717A] italic">No hay videos anteriores aún</span>
                )}

                <input
                  type="text"
                  placeholder="Pegar URL de video..."
                  value={manualVideoUrl}
                  onChange={(e) => {
                    setManualVideoUrl(e.target.value);
                    if (e.target.value) setSelectedVideoUrl("");
                  }}
                  className="bg-black border border-[#454933]/40 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-[#d1f025] w-32 placeholder-gray-600"
                />
              </div>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center space-x-1 text-rose-400 text-[9px] font-bold">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Render Automatically Detected Cast Assets */}
          {detectedAssets.map((asset, idx) => {
            const indexInCombined = combinedRefImages.indexOf(asset.imageUrl);
            const isInActiveRange = indexInCombined >= 0 && indexInCombined < 5;
            const willBeIgnored = !isInActiveRange && combinedRefImages.length > 5;
            
            return (
              <div 
                key={`detected-${idx}`}
                className={`relative group flex items-center rounded-lg p-1 pr-2.5 space-x-1.5 shadow-sm border ${
                  isInActiveRange 
                    ? 'bg-[#18191e] border-[#d1f025]/40' 
                    : 'bg-[#18191e]/50 border-gray-600/40 opacity-50'
                }`}
                title={`${asset.type}: ${asset.name} (Auto-vinculado)${willBeIgnored ? ' - NO SE USARÁ (excede límite de 5)' : ''}`}
              >
                <div className={`w-7 h-7 rounded overflow-hidden ${
                  isInActiveRange 
                    ? 'border border-[#d1f025]/30 bg-black/40' 
                    : 'border border-gray-600/30 bg-black/20'
                }`}>
                  <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {isInActiveRange && (
                    <div className="absolute top-0 left-0 bg-[#d1f025] text-black font-mono font-black text-[7px] px-1">
                      {indexInCombined + 1}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[8px] font-black uppercase tracking-wider leading-none ${
                    isInActiveRange ? 'text-[#d1f025]' : 'text-gray-500'
                  }`}>{asset.type}</span>
                  <span className={`text-[10px] font-medium truncate max-w-[80px] ${
                    isInActiveRange ? 'text-white' : 'text-gray-500'
                  }`}>@{asset.name}</span>
                </div>
                <span className={`absolute -top-1.5 -right-1.5 font-mono font-black text-[7px] px-1 rounded-full border scale-90 ${
                  isInActiveRange 
                    ? 'bg-[#d1f025] text-black border-black' 
                    : 'bg-gray-600 text-gray-300 border-gray-700'
                }`}>
                  {willBeIgnored ? '❌' : 'Auto'}
                </span>
              </div>
            );
          })}

          {/* Render Active Character/Prop Avatars as visual inputs if they exist */}
          {refImageUrls.map((imgUrl, idx) => {
            const totalImages = combinedRefImages.length;
            const isInActiveRange = idx < 5; // API only accepts first 5
            const willBeIgnored = totalImages > 5 && !isInActiveRange;
            
            return (
              <div 
                key={idx} 
                className={`w-10 h-10 rounded border overflow-hidden cursor-pointer transition-all relative group ${
                  isInActiveRange 
                    ? 'border-[#d1f025] shadow-[0_0_8px_rgba(209,240,37,0.3)]' 
                    : 'border-gray-600 opacity-50'
                }`}
              >
                <img src={imgUrl} alt={`Ref ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {isInActiveRange && (
                  <div className="absolute -top-1 -right-1 bg-[#d1f025] text-black font-mono font-black text-[8px] px-1 rounded-full border border-black z-10">
                    {idx + 1}
                  </div>
                )}
                {willBeIgnored && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <span className="text-[8px] text-red-400 font-bold">❌</span>
                  </div>
                )}
                <div 
                  onClick={() => setRefImageUrls(refImageUrls.filter((_, i) => i !== idx))}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-rose-400 font-bold z-20"
                >
                  Eliminar
                </div>
              </div>
            );
          })}

          {/* Warning when exceeding 5 reference images limit */}
          {combinedRefImages.length > 5 && (
            <div className="col-span-full flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-[10px]">
              <span className="text-amber-400 font-bold">⚠️</span>
              <div className="flex-1 text-amber-200">
                <span className="font-bold">Límite de API: </span>
                Solo las primeras <span className="font-black text-[#d1f025]">5 imágenes</span> se enviarán a VideoGenAPI.
                <br />
                <span className="text-amber-300/70">Tienes {combinedRefImages.length} imágenes totales. Elimina o reordena para elegir cuáles usar.</span>
              </div>
            </div>
          )}

          {/* Quick preset thumbnail loaders if empty list */}
          {refImageUrls.length === 0 && detectedAssets.length === 0 && (
            <div className="flex items-center space-x-2 text-[10px] text-[#71717A] italic">
              <span>Sin referencias cargadas. Sube una arriba o clica un preset demo:</span>
              <button 
                type="button" 
                onClick={() => insertMockImage("https://lh3.googleusercontent.com/aida-public/AB6AXuD2gzAsJ6My9sCinodWcJ-nP2PFBE8u8NAw4byKzOozQvHRjL9fRATsXkSqh8ks11pLdNW0rD4sKrHr6frMLeoH7j7IGlPuK6I6a4OqKw4NWZ6l46pNNhvYXRmgKkb-Yhp1wpWiXoc--K9R1FYt9HgVqp53R3vN_drA3YObWI9Axj4wO9oyhPJfrdmKaXVBUZDv6wLI9xqy-_qSnbx55HtcFS2lsl_TcEYhIY4ZlX2U2sDaNut3IagbNw")}
                className="px-2 py-0.5 bg-[#1e1f23] rounded border border-[#454933]/30 hover:text-white"
              >
                Piedra Negra
              </button>
              <button 
                type="button" 
                onClick={() => insertMockImage("https://lh3.googleusercontent.com/aida-public/AB6AXuAaeZE8Z_hQifxoyVy5mJ1O1qtgKzSu9LFRrWU9lDRNVswP77v2yzLV00_cBojeAaalEOYbj2gxi8h3Ctrt17lhhyg9OPjsq2qOCYslYirXp6FQAdbNneZz3eLQNoUxGrwLTJwmPgK8xcGW_1m_ldbzYhirlruvZa6PZVTZmTJV5lct1DTjtXr-BZ8j0J3yZzaF2HP9iYu_AvvBSoV0ud-V4eV7oAl_NvRLpLRjcy-90H5UUH-fQ0rJ0w")}
                className="px-2 py-0.5 bg-[#1e1f23] rounded border border-[#454933]/30 hover:text-white"
              >
                Duende de Musgo
              </button>
            </div>
          )}
        </div>

        {/* Text Area with Autocomplete relative wrapper */}
        <div className="relative w-full border-t border-[#454933]/15">
          {/* Dropdown de Autocompletado @ */}
          {showAtDropdown && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#18191e] border border-[#d1f025]/40 rounded-xl shadow-2xl p-2.5 z-40 max-h-52 overflow-y-auto custom-scrollbar">
              <div className="text-[10px] font-black text-gray-400 px-2 py-1.5 border-b border-[#454933]/25 flex justify-between items-center mb-1.5 font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <span className="text-[#d1f025]">@</span> SELECCIONAR ELEMENTO DEL CASTING
                </span>
                {atSearchQuery ? (
                  <span className="text-[#d1f025] font-bold">Filtro: "{atSearchQuery}"</span>
                ) : (
                  <span className="text-[#71717A]">Escribe para buscar...</span>
                )}
              </div>
              {filteredCastAssets.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 font-mono">
                  No se encontraron elementos de casting con "{atSearchQuery}". Crea personajes, objetos o escenarios en el menú lateral para poder mencionarlos con @.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {filteredCastAssets.map((asset) => (
                    <button
                      key={`${asset.type}-${asset.id}`}
                      type="button"
                      onClick={() => handleSelectAssetAt(asset.name)}
                      className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-[#d1f025]/15 text-left text-xs transition-colors border border-transparent hover:border-[#d1f025]/25 text-white"
                    >
                      <div className="w-7 h-7 rounded border border-[#d1f025]/25 overflow-hidden bg-black/40 shrink-0">
                        {((asset as any).avatarUrl || (asset as any).imageUrl) ? (
                          <img 
                            src={(asset as any).avatarUrl || (asset as any).imageUrl} 
                            alt={asset.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-[10px] text-gray-400 font-bold uppercase font-mono">
                            {asset.name.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate flex items-center justify-between">
                          <span className="text-white">@{asset.name}</span>
                          <span className="text-[8px] font-black uppercase text-[#d1f025] bg-[#d1f025]/10 px-1.5 py-0.5 rounded leading-none">
                            {asset.type}
                          </span>
                        </div>
                        <div className="text-[9px] text-gray-400 truncate leading-tight">{asset.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative w-full h-28 p-4">
            <textarea 
              id="prompt-textarea"
              className="w-full h-full bg-transparent border-none resize-none text-sm text-white focus:ring-0 placeholder:text-gray-500 p-0 focus:outline-none focus:border-transparent" 
              placeholder="Describe tu escena - usa @ para insertar personajes, escenarios u objetos del casting con persistencia..."
              value={promptText}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowAtDropdown(false);
                }
              }}
            />
          </div>
        </div>

        {/* Materials Dropdown / Injection Tags */}
        <div className="px-4 py-1.5 bg-black/10 border-t border-[#454933]/15 flex items-center justify-between flex-wrap gap-2 text-[10px]">
          <div className="flex items-center space-x-1.5">
            <span className="text-[#71717A] uppercase font-mono">Quick Casting:</span>
            {characters.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleInsertBadge(`@${c.name}`)}
                className="px-2 py-0.5 bg-[#1e1f23] hover:bg-[#d1f025]/15 hover:text-[#d1f025] rounded border border-[#454933]/30 transition-all text-slate-300"
              >
                @{c.name}
              </button>
            ))}
            {locations.map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => handleInsertBadge(`@${l.name}`)}
                className="px-2 py-0.5 bg-[#1e1f23] hover:bg-[#d1f025]/15 hover:text-[#d1f025] rounded border border-[#454933]/30 transition-all text-slate-300"
              >
                @{l.name}
              </button>
            ))}
            {characters.length === 0 && locations.length === 0 && (
              <span className="text-[#71717A] italic">No casting assets yet. Use left side menu to add!</span>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-primary-container hover:underline font-mono text-[9px]"
          >
            {showAdvanced ? "HIDE PARAMETERS ▲" : "SHOW PARAMETERS ▼"}
          </button>
        </div>

        {/* Advanced Panel Drawer inside the editor glass */}
        {showAdvanced && (
          <div className="p-4 bg-black/30 border-t border-[#454933]/20 space-y-4 text-xs animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Generation Mode */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Generation Mode</span>
                <select
                  value={generationType}
                  onChange={(e) => setGenerationType(e.target.value as GenerationMode)}
                  className="w-full bg-[#121317] border border-[#454933]/30 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none"
                >
                  <option value="text-to-video">Text-to-Video</option>
                  <option value="image-to-video">Image-to-Video</option>
                  <option value="reference-to-video">Multi-Reference</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Aspect Ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(normalizeAspectRatio(e.target.value))}
                  className="w-full bg-[#121317] border border-[#454933]/30 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none"
                >
                  <option value="16:9">16:9 Cinema</option>
                  <option value="4:3">4:3 Classic</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="9:21">9:21 Vertical</option>
                </select>
              </div>

              {/* Resolution */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Output Resolution</span>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as Resolution)}
                  className="w-full bg-[#121317] border border-[#454933]/30 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none"
                >
                  <option value="480p">480p Low-fi</option>
                  <option value="720p">720p High-def</option>
                  <option value="1080p">1080p Cinematic</option>
                  <option value="4k">4K Master</option>
                </select>
              </div>

              {/* Seed */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Randomizer Seed</span>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value))}
                  placeholder="-1 for random"
                  className="w-full bg-[#121317] border border-[#454933]/30 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Custom references upload row */}
            {generationType !== "text-to-video" && (
              <div className="space-y-1.5 border-t border-[#454933]/15 pt-3">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Add Custom Image URL Reference</span>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/reference-image.png"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 bg-[#121317] border border-[#454933]/30 rounded-lg px-3 py-1 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddRefImage}
                    className="bg-[#343539] border border-[#454933]/30 hover:bg-white/10 px-3 py-1 rounded-lg text-xs font-semibold text-white"
                  >
                    Load Image
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toolbar & Actions */}
        <div className="p-3.5 border-t border-outline-variant/30 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-8 h-8 rounded bg-surface-variant flex items-center justify-center text-[#c8c6c5] hover:text-[#d1f025] transition-colors cursor-pointer"
              title="Cargar Imagen de Referencia (+)"
            >
              <Plus className="w-4 h-4 text-[#c8c6c5]" />
            </button>
            <button 
              type="button"
              onClick={handleAtButtonClick}
              className="w-8 h-8 rounded bg-surface-variant flex items-center justify-center text-[#c8c6c5] hover:text-[#d1f025] transition-colors font-bold font-mono text-sm cursor-pointer"
              title="Mencionar elemento del Casting (@)"
            >
              @
            </button>
            
            <div className="h-4 w-px bg-outline-variant mx-1"></div>
            
            {/* Cinema model picker tag */}
            <button 
              type="button"
              onClick={() => setShowModelModal(true)}
              className="px-3 py-1.5 rounded bg-surface-variant flex items-center gap-1.5 text-[11px] font-bold text-secondary hover:text-[#d1f025] transition-colors border border-transparent hover:border-outline-variant cursor-pointer"
              title="Seleccionar Modelo"
            >
              <Cpu className="w-3.5 h-3.5 text-primary-container" />
              <span>{MODELS_LIST.find(m => m.id === model)?.name || model}</span>
            </button>

            {/* Aspect Ratio Tag button */}
            <button 
              type="button"
              onClick={() => {
                const allowedRatios: AspectRatio[] = ["16:9", "4:3", "1:1", "9:21"];
                const currentIndex = allowedRatios.indexOf(normalizeAspectRatio(aspectRatio));
                const nextIndex = (currentIndex + 1) % allowedRatios.length;
                setAspectRatio(allowedRatios[nextIndex]);
              }}
              className="px-3 py-1.5 rounded bg-surface-variant flex items-center gap-1.5 text-[11px] font-bold text-secondary hover:text-[#e3e2e7] transition-all cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-secondary" />
              <span>{aspectRatio}</span>
            </button>

            {/* Resolution button */}
            <button 
              type="button"
              onClick={() => {
                const spec = MODEL_SPECS[model] || MODEL_SPECS["seedance-25"];
                const allowed = spec.resolutions;
                const currentIndex = allowed.indexOf(resolution as any);
                const nextIndex = (currentIndex + 1) % allowed.length;
                setResolution(allowed[nextIndex]);
              }}
              className="px-3 py-1.5 rounded bg-surface-variant flex items-center gap-1.5 text-[11px] font-bold text-secondary hover:text-[#e3e2e7] transition-all cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5 text-secondary" />
              <span>{resolution}</span>
            </button>

            {/* Duration Control widget */}
            <div className="flex items-center bg-surface-variant rounded overflow-hidden">
              <button 
                type="button"
                disabled={(() => {
                  return allowedDurationsForContext.indexOf(duration) <= 0;
                })()}
                onClick={() => {
                  const allowed = allowedDurationsForContext;
                  const index = allowed.indexOf(duration);
                  if (index > 0) {
                    setDuration(allowed[index - 1]);
                  }
                }}
                className="px-2 py-1.5 text-secondary hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="text-xs font-black text-white px-2 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary-container" />
                <span>{duration}s</span>
              </span>
              <button 
                type="button"
                disabled={(() => {
                  const allowed = allowedDurationsForContext;
                  const index = allowed.indexOf(duration);
                  return index === -1 || index >= allowed.length - 1;
                })()}
                onClick={() => {
                  const allowed = allowedDurationsForContext;
                  const index = allowed.indexOf(duration);
                  if (index !== -1 && index < allowed.length - 1) {
                    setDuration(allowed[index + 1]);
                  }
                }}
                className="px-2 py-1.5 text-secondary hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            {model === "seedance-25" && hasReferenceContext && (
              <span className="text-[10px] font-mono text-amber-300/90">
                Con imagen/video/referencias, Seedance 2.5 permite hasta 10s.
              </span>
            )}

            {/* Sound toggle button */}
            <button 
              type="button"
              onClick={() => setGenerateAudio(!generateAudio)}
              className={`px-3 py-1.5 rounded bg-surface-variant flex items-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                generateAudio ? "text-primary-container" : "text-[#71717A]"
              }`}
            >
              {generateAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{generateAudio ? "Con Sonido" : "Silenciado"}</span>
            </button>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              type="button"
              disabled={isGenerating || (!hasEnvApiKey && !apiKey) || !promptText.trim()}
              onClick={handleGenerateClick}
              className={`
                flex-1 md:flex-none
                px-6 py-2.5 md:py-2 rounded-xl font-button-text font-black uppercase tracking-wide
                transition-all flex items-center justify-center gap-2 leading-tight shadow-md
                disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer
                ${isGenerating
                  ? "bg-[#d1f025]/20 border-2 border-[#d1f025]/60 text-[#d1f025] animate-pulse"
                  : "bg-primary-container text-on-primary-container hover:brightness-110 glow-hover"
                }
              `}
            >
              {isGenerating
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Play className="w-4 h-4 fill-current text-black" />
              }
              <span className={isGenerating ? "text-[#d1f025]" : "text-black"}>
                {isGenerating ? "Generando..." : "Generar Shot"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Visual de Selección de Horario del Día */}
      {showTimeOfDayModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111216] border border-[#454933]/50 rounded-2xl p-6 max-w-2xl w-full shadow-2xl relative">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#d1f025]" />
              Seleccionar Horario del Día
            </h3>
            <p className="text-xs text-gray-400 mb-5">Elige el horario y atmósfera de iluminación para tu escena en Isla Mágica:</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {[
                { value: "dawn" as const, name: "Amanecer", desc: "Luz suave rosa y naranja, atmósfera mágica", gradient: "from-pink-400 via-orange-300 to-yellow-200" },
                { value: "day" as const, name: "Día", desc: "Luz brillante natural, cielo azul vibrante", gradient: "from-sky-400 via-blue-300 to-cyan-200" },
                { value: "afternoon" as const, name: "Tarde", desc: "Luz cálida dorada, golden hour", gradient: "from-amber-400 via-orange-300 to-yellow-300" },
                { value: "sunset" as const, name: "Atardecer", desc: "Cielo naranja y púrpura, luz cinematográfica", gradient: "from-orange-500 via-pink-400 to-purple-400" },
                { value: "night" as const, name: "Noche", desc: "Atmósfera nocturna, luz de luna suave", gradient: "from-blue-900 via-indigo-700 to-purple-800" }
              ].map(tod => (
                <button
                  key={tod.value}
                  type="button"
                  onClick={() => { 
                    onCameraSettingsChange({ ...cameraSettings, timeOfDay: tod.value }); 
                    setShowTimeOfDayModal(false); 
                  }}
                  className={`group relative rounded-xl overflow-hidden border text-left flex flex-col transition-all cursor-pointer h-[120px] ${
                    cameraSettings.timeOfDay === tod.value ? "border-[#d1f025] bg-[#d1f025]/5" : "border-white/10 hover:border-white/30 bg-[#16181d]"
                  }`}
                >
                  <div className={`w-full h-16 relative overflow-hidden bg-gradient-to-br ${tod.gradient} opacity-80 group-hover:opacity-100 transition-opacity`}>
                    {cameraSettings.timeOfDay === tod.value && (
                      <div className="absolute top-1.5 right-1.5 bg-[#d1f025] text-black rounded-full p-0.5 shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 flex-1 flex flex-col justify-between">
                    <span className="text-xs font-black text-white leading-tight">{tod.name}</span>
                    <span className="text-[9px] text-gray-400 leading-tight truncate">{tod.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() => setShowTimeOfDayModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Selección de Modelo */}
      {showModelModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111216] border border-[#454933]/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2 font-mono">
              <Cpu className="w-4 h-4 text-[#d1f025]" />
              SELECCIONAR MODELO DE COLA DE RENDER
            </h3>
            <p className="text-xs text-gray-400 mb-5">Elige el motor de renderizado de la API con soporte completo para todos los modelos cinematográficos:</p>
            
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {MODELS_LIST.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setModel(m.id); setShowModelModal(false); }}
                  className={`w-full p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    model === m.id ? "border-[#d1f025] bg-[#d1f025]/5 shadow-lg" : "border-white/5 hover:border-white/20 bg-[#16181d]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-black text-white flex items-center gap-1.5 font-mono">
                      {m.name}
                      <span className="text-[8px] bg-[#d1f025]/15 text-[#d1f025] px-1.5 py-0.5 rounded font-black uppercase">
                        {m.badge}
                      </span>
                    </span>
                    <span className="text-[9px] text-[#d1f025] font-mono font-bold bg-[#d1f025]/5 px-2 py-0.5 rounded border border-[#d1f025]/10">{m.cost}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal">{m.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
