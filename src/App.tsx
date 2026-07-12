/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  CharacterAsset, 
  PropAsset, 
  LocationAsset, 
  CameraSettings, 
  VideoTask, 
  GenerationInput,
  GenerationMode,
  ReferenceFrameAsset
} from "./types";
import { 
  DEFAULT_CHARACTERS, 
  DEFAULT_PROPS, 
  DEFAULT_LOCATIONS 
} from "./defaultData";
import { API_BASE_URL } from "./config";
import { 
  Film, 
  Sparkles, 
  AlertCircle, 
  History, 
  Compass, 
  Users, 
  RefreshCw,
  Coins,
  ShieldCheck,
  Video,
  AtSign,
  Wand2,
  MessageSquare,
  Pin,
  Filter,
  LayoutGrid,
  Upload,
  Share2,
  Settings,
  HelpCircle,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ExternalLink,
  Plus,
  Layers,
  SkipBack,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Info,
  Trash2,
  LogOut,
  User
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import AssetLibraryPanel from "./components/AssetLibraryPanel";
import PromptBuilderPanel from "./components/PromptBuilderPanel";
import VideoHistoryPanel from "./components/VideoHistoryPanel";
import { ClipBlueprint, SceneBlueprint } from "./components/AIDirectorPanel";
import ScriptPanel from "./components/ScriptPanel";
import CameraOverlay from "./components/CameraOverlay";
import { compileFinalPrompt, getAssetHandle, harvestAndSortRefImages } from "./utils";
import { 
  initSupabase, 
  getCharacters,
  saveCharacter, 
  deleteCharacter, 
  getProps,
  saveProp, 
  deleteProp, 
  getLocations,
  saveLocation, 
  deleteLocation, 
  getReferenceFrames,
  saveReferenceFrame,
  deleteReferenceFrame
} from "./lib/supabase";
import { deleteTaskDoc } from "./lib/firebase";

const parseTimestampToSeconds = (val: any): number => {
  if (!val) return Math.floor(Date.now() / 1000);
  
  if (typeof val === "number") {
    if (val > 99999999999) {
      return Math.floor(val / 1000);
    }
    return Math.floor(val);
  }
  
  if (typeof val === "string") {
    if (/^\d+$/.test(val)) {
      const parsed = parseInt(val, 10);
      if (parsed > 99999999999) {
        return Math.floor(parsed / 1000);
      }
      return parsed;
    }
    const parsedDate = new Date(val);
    if (!isNaN(parsedDate.getTime())) {
      return Math.floor(parsedDate.getTime() / 1000);
    }
  }
  
  return Math.floor(Date.now() / 1000);
};

const extractApiErrorMessage = (data: any, fallback: string): string => {
  if (!data) return fallback;

  const details: string[] = [];
  const pushDetail = (value: any) => {
    if (!value) return;
    if (typeof value === "string") {
      details.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          details.push(item);
        } else if (item && typeof item === "object") {
          const field = item.field || item.path || item.loc || item.param || "field";
          const message = item.message || item.msg || item.error || JSON.stringify(item);
          details.push(`${field}: ${message}`);
        }
      }
      return;
    }
    if (typeof value === "object") {
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === "string") {
          details.push(`${key}: ${val}`);
        } else if (Array.isArray(val)) {
          for (const nested of val) {
            details.push(`${key}: ${typeof nested === "string" ? nested : JSON.stringify(nested)}`);
          }
        }
      }
    }
  };

  let baseMessage = fallback;
  if (typeof data.error === "object" && data.error && typeof data.error.message === "string") {
    baseMessage = data.error.message;
  } else if (typeof data.message === "string") {
    baseMessage = data.message;
  } else if (typeof data.error === "string") {
    baseMessage = data.error;
  }

  pushDetail(data.error?.details);
  pushDetail(data.details);
  pushDetail(data.detail);
  pushDetail(data.errors);
  pushDetail(data.provider?.errors);
  pushDetail(data.provider?.detail);
  pushDetail(data.provider?.details);

  const uniqueDetails = Array.from(new Set(details)).filter(Boolean);
  const fullTextForSafetyCheck = `${baseMessage}\n${uniqueDetails.join("\n")}`.toLowerCase();

  const rateLimitExceeded =
    fullTextForSafetyCheck.includes("rate limit exceeded") ||
    fullTextForSafetyCheck.includes("too many requests") ||
    fullTextForSafetyCheck.includes("seconds_until_reset") ||
    (fullTextForSafetyCheck.includes("limited to") && fullTextForSafetyCheck.includes("generations per"));

  const detailsObj =
    (data && typeof data.details === "object" && data.details) ||
    (data && data.error && typeof data.error.details === "object" && data.error.details) ||
    (data && data.provider && typeof data.provider.details === "object" && data.provider.details) ||
    null;

  const waitSeconds = typeof detailsObj?.seconds_until_reset === "number" ? detailsObj.seconds_until_reset : null;
  const waitMinutes = waitSeconds !== null ? Math.max(1, Math.ceil(waitSeconds / 60)) : null;

  const plainResetMatch = `${baseMessage}\n${uniqueDetails.join("\n")}`.match(/reset_time\s*[:=]\s*([0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}:[0-9]{2})/i);
  const plainWindowMatch = `${baseMessage}\n${uniqueDetails.join("\n")}`.match(/window\s*[:=]\s*([^\n]+)/i);
  const plainModelMatch = `${baseMessage}\n${uniqueDetails.join("\n")}`.match(/model\s*[:=]\s*([^\n]+)/i);

  const parseResetUtc = (rawReset: any): Date | null => {
    if (typeof rawReset !== "string" || !rawReset.trim()) return null;
    const trimmed = rawReset.trim().replace(" ", "T");
    const hasTimezone = /z$|[+-]\d{2}:?\d{2}$/i.test(trimmed);
    const utcString = hasTimezone ? trimmed : `${trimmed}Z`;
    const parsed = new Date(utcString);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const resetDateUtc = parseResetUtc(detailsObj?.reset_time || plainResetMatch?.[1])
    || (waitSeconds !== null ? new Date(Date.now() + waitSeconds * 1000) : null);

  const resetTimeBogota = resetDateUtc
    ? new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(resetDateUtc)
    : null;

  if (rateLimitExceeded) {
    const modelLabel =
      (typeof detailsObj?.model === "string" && detailsObj.model.trim()) ||
      (plainModelMatch?.[1]?.trim()) ||
      null;

    const lines = [
      "⏳ Límite de generaciones alcanzado (rate limit).",
      modelLabel !== null ? `Modelo: ${modelLabel}` : "",
      waitMinutes !== null
        ? `⏱️ Tiempo restante: ${waitMinutes} minutos`
        : "Intenta de nuevo en unos minutos.",
      resetTimeBogota !== null
        ? `🕒 Reinicio a las ${resetTimeBogota} (hora Colombia UTC-5)`
        : "",
      "💡 El sistema tiene 2 API keys que se alternan automáticamente.",
      "Si ambas están agotadas, espera el tiempo indicado arriba."
    ].filter(Boolean);
    return lines.join("\n");
  }

  const blockedByAudioSafety =
    fullTextForSafetyCheck.includes("output audio may contain sensitive") ||
    fullTextForSafetyCheck.includes("audio may contain sensitive") ||
    fullTextForSafetyCheck.includes("sensitive information");

  const blockedBySafety =
    fullTextForSafetyCheck.includes("potentially dangerous content") ||
    fullTextForSafetyCheck.includes("dangerous content") ||
    fullTextForSafetyCheck.includes("unsafe") ||
    fullTextForSafetyCheck.includes("content policy") ||
    fullTextForSafetyCheck.includes("safety policy");

  const quotaExceeded =
    fullTextForSafetyCheck.includes("exceeded the daily limit") ||
    fullTextForSafetyCheck.includes("daily limit") ||
    fullTextForSafetyCheck.includes("points used") ||
    fullTextForSafetyCheck.includes("quota") ||
    fullTextForSafetyCheck.includes("monthly usage limit") ||
    fullTextForSafetyCheck.includes("insufficient balance");

  const genericSubmitFailure =
    fullTextForSafetyCheck.includes("failed to submit request to video generation service") ||
    fullTextForSafetyCheck.includes("ailed to submit request to video generation service");

  if (genericSubmitFailure) {
    const modelLabel =
      (typeof detailsObj?.model === "string" && detailsObj.model.trim()) ||
      (plainModelMatch?.[1]?.trim()) ||
      null;
    const lines = [
      "El proveedor no pudo aceptar la solicitud de generacion en este momento.",
      modelLabel ? `Modelo: ${modelLabel}.` : "",
      "Posibles causas: limite temporal (429), cuota diaria agotada, o fallo temporal del servicio.",
      "Acciones: reintenta en 2-5 minutos, reduce duracion/resolucion, o cambia de modelo/API Key."
    ].filter(Boolean);
    return lines.join("\n");
  }

  if (blockedByAudioSafety) {
    return [
      "⚠️ El audio fue bloqueado por el filtro de seguridad del proveedor.",
      "Causa: el prompt describe di\u00e1logos, canciones o voces, y el modelo detect\u00f3 posible contenido sensible en el audio generado.",
      "Soluc\u00f3n: desactiva la opci\u00f3n 'Audio' en el clip y vuelve a intentarlo.",
      "Tip: el audio ambiente (olas, brisa, pasos) generalmente no causa este error; el problema ocurre cuando hay voces o m\u00fasica con letra."
    ].join("\n");
  }

  if (quotaExceeded) {
    return [
      "Se alcanzó el limite diario de solicitudes de tu API Key en el proveedor.",
      "Acciones: espera el reinicio de cuota o cambia a otra API Key disponible.",
      "Tip: verifica tu uso actual en /api/v1/user dentro del panel del proveedor."
    ].join("\n");
  }

  if (blockedBySafety) {
    return [
      "El proveedor bloqueo el prompt por seguridad de contenido.",
      "Sugerencia: reescribe el prompt con lenguaje neutral y descriptivo, sin dano explicito, violencia grafica, armas, amenazas o instrucciones de riesgo.",
      "Ejemplo de estilo seguro: 'escena cinematografica de tension, sin violencia explicita, enfoque en atmosfera, iluminacion y expresiones'."
    ].join("\n");
  }

  if (uniqueDetails.length === 0) {
    return baseMessage;
  }

  return `${baseMessage}\n${uniqueDetails.join("\n")}`;
};

export default function App() {
  // Auth
  const { user, signOut } = useAuth();
  
  // 1. Assets State (initially empty, loaded from Firebase)
  const [characters, setCharacters] = useState<CharacterAsset[]>([]);
  const [props, setProps] = useState<PropAsset[]>([]);
  const [locations, setLocations] = useState<LocationAsset[]>([]);
  const [referenceFrames, setReferenceFrames] = useState<ReferenceFrameAsset[]>([]);

  // Sequential Rendering States
  const [isSequentiallyRendering, setIsSequentiallyRendering] = useState(false);
  const [sequentialRenderProgress, setSequentialRenderProgress] = useState<{
    current: number;
    total: number;
    status: string;
  } | null>(null);

  // Rate Limit & Queue States
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    currentUsage: number;
    limit: number;
    resetTime: string;
    secondsUntilReset: number;
  } | null>(null);
  const [requestQueue, setRequestQueue] = useState<Array<{
    id: string;
    input: GenerationInput;
    model: string;
    sceneTitle?: string;
    clipNumber?: number;
    retryCount: number;
  }>>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Multi-Key Load Balancing States
  const [multiKeyStatus, setMultiKeyStatus] = useState<{
    totalKeys: number;
    availableKeys: number;
    loadBalancingActive: boolean;
    keys: Array<{
      index: number;
      alias: string;
      keyPreview: string;
      isAvailable: boolean;
      currentUsage: number;
      limit: number;
      resetInSeconds: number;
      resetTime: string | null;
    }>;
  } | null>(null);
  const [showMultiKeyMonitor, setShowMultiKeyMonitor] = useState(false);

  // 2. Camera Settings State
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
    pan: "none",
    tilt: "none",
    zoom: "none",
    roll: "none",
    speed: "normal",
    style: "auto",
    timeOfDay: "day",
    motionCurve: "ease-in-out",
  });

  // 3. Prompt & API key state
  const [promptText, setPromptText] = useState("");
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("seedance_api_key") || "";
  });
  const [hasEnvApiKey, setHasEnvApiKey] = useState(false);
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(false);
  const [model, setModel] = useState("seedance-2");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"director" | "history">("director");
  const [activeTab, setActiveTab] = useState<"studio" | "history" | "assets">("studio");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 4. Tasks (History) State (loaded from Firebase)
  const [tasks, setTasks] = useState<VideoTask[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPollingMap, setIsPollingMap] = useState<Record<string, boolean>>({});
  const [lastUsedSeed, setLastUsedSeed] = useState(-1);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Layout UI States
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isAssetsPanelOpen, setIsAssetsPanelOpen] = useState(true);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [playingVideoPoster, setPlayingVideoPoster] = useState<string | null>(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);

  // Generation queue — 3-minute spacing to never hit rate limit
  const GENERATION_SPACING_MS = 3 * 60 * 1000; // 3 min universal between every request
  const lastGenerationTime = useRef<number>(0);
  const [queueCountdown, setQueueCountdown] = useState<number>(0); // seconds remaining before next send
  
  // Settings copy & Frame Extraction states
  const [activeReplayTask, setActiveReplayTask] = useState<VideoTask | null>(null);
  const [extractedRefImage, setExtractedRefImage] = useState<string | null>(null);
  const [extractingTaskId, setExtractingTaskId] = useState<string | null>(null);
  const [activeContextVideoUrl, setActiveContextVideoUrl] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // Firebase Auth Identity
  const [userId, setUserId] = useState<string | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);

  // Keep track of active polling intervals to clear on unmount
  const activeIntervals = useRef<Record<string, any>>({});

  // Fetch tasks from the proxy API & sync them with Firestore
  const fetchApiTasks = async (): Promise<VideoTask[]> => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const activeKey = apiKey || "";
      if (activeKey) {
        headers["Authorization"] = `Bearer ${activeKey}`;
      }
      const res = await fetch(`${API_BASE_URL}/api/seedance/history`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to fetch history from API: ${res.status}`);
      }
      const data = await res.json();
      const rawList = data.generations || data.data || (Array.isArray(data) ? data : []);
      
      const statusMap: Record<string, string> = {
        "pending": "queued",
        "in_progress": "generating",
        "completed": "completed",
        "failed": "failed"
      };

      return rawList.map((item: any) => {
        const id = item.id || item.generation_id || item.taskId;
        const originalStatus = item.status;
        const normalizedStatus = statusMap[originalStatus] || originalStatus || "queued";
        const videoUrl = item.video_url || item.url || (item.data?.results?.[0]) || null;
        
        const parsed = {
          id,
          status: normalizedStatus as any,
          created_at: parseTimestampToSeconds(item.created_at || item.created_at_time),
          model: item.model || "seedance-2",
          failed_reason: item.failed_reason || item.error || item.message || null,
          input: {
            prompt: item.prompt || item.input?.prompt || "",
            aspect_ratio: item.aspect_ratio || item.input?.aspect_ratio || "16:9",
            duration: item.duration || item.input?.duration || 5,
            resolution: item.resolution || item.input?.resolution || "720p",
            style: item.style || item.input?.style || "realistic",
            generate_audio: item.generate_audio ?? item.input?.generate_audio ?? true,
            return_last_frame: item.return_last_frame ?? item.input?.return_last_frame ?? false,
            web_search: item.web_search ?? item.input?.web_search ?? false,
            nsfw_checker: item.nsfw_checker ?? item.input?.nsfw_checker ?? false,
            seed: item.seed ?? item.input?.seed ?? -1,
            generation_type: item.generation_type || item.input?.generation_type || "text-to-video"
          },
          sceneTitle: item.sceneTitle || null,
          clipNumber: item.clipNumber || null,
          data: {
            results: videoUrl ? [videoUrl] : [],
            last_frame_url: videoUrl,
            processing_time: item.processing_time || null,
            ...item.data,
            ...item
          }
        };
        
        console.log("[Frontend] Parsed video task:", {
          id: parsed.id,
          status: parsed.status,
          model: parsed.model,
          resolution: parsed.input.resolution,
          hasVideoUrl: !!videoUrl
        });
        
        return parsed;
      });
    } catch (err) {
      console.warn("Could not fetch history from API, falling back:", err);
      return [];
    }
  };

  const syncHistoryWithApi = async (currentUserId: string | null = null, forceShowLoading: boolean = false) => {
    const targetUserId = currentUserId || userId;
    if (!targetUserId) return;

    if (forceShowLoading) {
      setIsSyncingHistory(true);
    }
    
    try {
      // Fetch from proxy API
      const apiTasks = await fetchApiTasks();
      
      console.log(`[Frontend] 📊 Fetched ${apiTasks.length} tasks from API`);
      
      // Sort by created_at descending
      apiTasks.sort((a, b) => b.created_at - a.created_at);
      
      setTasks(apiTasks);
      console.log(`[Frontend] ✅ Updated tasks state with ${apiTasks.length} videos`);

      // Start polling for any unfinished tasks
      apiTasks.forEach((task) => {
        if (task.status === "queued" || task.status === "generating") {
          startPollingTask(task.id, targetUserId);
        }
      });
    } catch (err) {
      console.error("Error syncing history with API:", err);
    } finally {
      if (forceShowLoading) {
        setIsSyncingHistory(false);
      }
    }
  };

  // Sync custom API key to LocalStorage
  useEffect(() => {
    localStorage.setItem("seedance_api_key", apiKey);
  }, [apiKey]);

  // 6. Check server API key configuration on launch
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/config`);
        if (res.ok) {
          const data = await res.json();
          setHasEnvApiKey(data.hasApiKey);
          setHasGeminiKey(data.hasGeminiKey);
          
          // Show error notification if API key is missing
          if (!data.hasApiKey) {
            setErrorNotification(
              "⚠️ CONFIGURACIÓN FALTANTE: No se detectó VIDEOGEN_API_KEY en el servidor. " +
              "El botón de generación está deshabilitado. " +
              "Configura las variables de entorno en tu plataforma de hosting. " +
              "Consulta PRODUCCION_ENV.md para instrucciones."
            );
          }
          
          // Check if multi-key load balancing is enabled
          if (data.multiKeyEnabled) {
            setShowMultiKeyMonitor(true);
            fetchMultiKeyStatus();
          }
          
          // Note: API keys now managed exclusively via .env (multi-key system)
          // UI input panel disabled - all keys loaded from environment variables
        } else {
          console.error("Failed to fetch server config:", res.status);
          setErrorNotification(
            "⚠️ ERROR DE SERVIDOR: No se pudo conectar al endpoint /api/config. " +
            "Verifica que el servidor esté funcionando correctamente."
          );
        }
      } catch (err) {
        console.error("Failed to check server config", err);
        setErrorNotification(
          "⚠️ ERROR DE CONEXIÓN: No se pudo verificar la configuración del servidor. " +
          "Verifica que la aplicación esté corriendo y que /api/config sea accesible."
        );
      }
    };
    checkConfig();
  }, []);

  // Fetch multi-key status
  const fetchMultiKeyStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/keys/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMultiKeyStatus(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch multi-key status", err);
    }
  };

  // Poll multi-key status every 10 seconds if load balancing is active
  useEffect(() => {
    if (!showMultiKeyMonitor) return;
    
    const interval = setInterval(() => {
      fetchMultiKeyStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [showMultiKeyMonitor]);

  // Initialize Supabase and load user specific data
  useEffect(() => {
    const loadCloudData = async () => {
      try {
        const { userId: uid } = await initSupabase();
        setUserId(uid);

        // Fetch characters, props, and locations from Supabase
        const [sbChars, sbProps, sbLocs, sbFrames] = await Promise.all([
          getCharacters(uid),
          getProps(uid),
          getLocations(uid),
          getReferenceFrames(uid),
        ]);

        setCharacters(sbChars);
        setProps(sbProps);
        setLocations(sbLocs);
        setReferenceFrames(sbFrames);

        // Sync video tasks from the proxy API (no longer stored in database)
        await syncHistoryWithApi(uid);
      } catch (err: any) {
        console.error("Supabase startup failed:", err);
        
        // Provide specific error messages
        let errorMsg = "⚠️ ERROR DE BASE DE DATOS: ";
        if (err.message?.includes("Supabase configuration")) {
          errorMsg += "Faltan las variables SUPABASE_URL y SUPABASE_ANON_KEY en el servidor. ";
          errorMsg += "Los materiales (personajes, props, locaciones) no estarán disponibles. ";
          errorMsg += "Configura las variables de entorno en tu plataforma de hosting. ";
          errorMsg += "Consulta PRODUCCION_ENV.md para instrucciones.";
        } else if (err.message?.includes("Failed to load Supabase configuration")) {
          errorMsg += "No se pudo cargar la configuración de Supabase desde /api/supabase-config. ";
          errorMsg += "Verifica que el servidor esté corriendo correctamente.";
        } else {
          errorMsg += "No se pudo conectar a la base de datos. ";
          errorMsg += "Usando datos de respaldo locales. ";
          errorMsg += "Error: " + (err.message || String(err));
        }
        
        setErrorNotification(errorMsg);
        
        // Use default/fallback data
        setCharacters(DEFAULT_CHARACTERS);
        setProps(DEFAULT_PROPS);
        setLocations(DEFAULT_LOCATIONS);
      } finally {
        setIsFirebaseLoading(false);
      }
    };
    loadCloudData();

    return () => {
      Object.values(activeIntervals.current).forEach((interval) => clearInterval(interval as any));
    };
  }, []);

  // Auto-Setup: Persistencia Family Characters (if no characters exist)
  useEffect(() => {
    if (characters.length === 0 && !isFirebaseLoading) {
      const DEFAULT_IMAGE_URL = "https://bd.persistenciadigital.com/storage/v1/object/public/video-assets/reference-frames/hf_20260703_181242_91895a54-3ea8-4bef-a3fd-9c267ba9c111.png";
      
      console.log("[Auto-Setup] No characters found, initializing Persistencia Family...");
      setupPersistenciaFamily(DEFAULT_IMAGE_URL);
    }
  }, [characters.length, isFirebaseLoading]);

  // Auto-Setup: Isla Location (if characters exist but no locations)
  useEffect(() => {
    if (characters.length >= 4 && locations.length === 0 && !isFirebaseLoading) {
      console.log("[Auto-Setup] Characters configured, adding Isla location...");
      setupIslaLocation();
    }
  }, [characters.length, locations.length, isFirebaseLoading]);

  // 7. Polling logic for a specific task
  const checkTaskStatus = async (taskId: string, currentUserId: string | null = null) => {
    const targetUserId = currentUserId || userId;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const activeKey = apiKey || "";
      if (activeKey) {
        headers["Authorization"] = `Bearer ${activeKey}`;
      }

      setIsPollingMap(prev => ({ ...prev, [taskId]: true }));

      const res = await fetch(`${API_BASE_URL}/api/seedance/tasks/${taskId}`, { headers });
      if (!res.ok) {
        if (res.status === 404 || res.status === 401) {
          if (activeIntervals.current[taskId]) {
            clearInterval(activeIntervals.current[taskId]);
            delete activeIntervals.current[taskId];
          }
          setIsPollingMap(prev => ({ ...prev, [taskId]: false }));
        }
        return;
      }

      const taskData = await res.json();

      const updatedTaskFields = {
        status: taskData.status as any,
        failed_reason: taskData.failed_reason || taskData.data?.failed_reason || null,
        data: taskData.data
      };

      let updatedTask: VideoTask | null = null;
      setTasks((currentTasks) => {
        return currentTasks.map((t) => {
          if (t.id === taskId) {
            updatedTask = {
              ...t,
              ...updatedTaskFields
            };
            return updatedTask;
          }
          return t;
        });
      });

      // Clear polling if finished
      if (taskData.status === "completed" || taskData.status === "failed") {
        if (activeIntervals.current[taskId]) {
          clearInterval(activeIntervals.current[taskId]);
          delete activeIntervals.current[taskId];
        }
        setIsPollingMap(prev => ({ ...prev, [taskId]: false }));
      }
    } catch (err) {
      console.error("Error checking task", taskId, err);
    }
  };

  const startPollingTask = (taskId: string, currentUserId: string | null = null) => {
    if (activeIntervals.current[taskId]) return;

    setIsPollingMap(prev => ({ ...prev, [taskId]: true }));
    checkTaskStatus(taskId, currentUserId);

    const intervalId = setInterval(() => {
      checkTaskStatus(taskId, currentUserId);
    }, 10000);

    activeIntervals.current[taskId] = intervalId;
  };

  // 9. Handlers for creating assets
  const handleAddCharacter = async (char: Omit<CharacterAsset, "id">) => {
    const newChar: CharacterAsset = {
      ...char,
      id: `char-${Date.now()}`
    };
    setCharacters(prev => [...prev, newChar]);
    if (userId) {
      try {
        await saveCharacter(userId, newChar);
      } catch (e) {
        console.error("Error saving character to cloud:", e);
      }
    }
  };

  const handleAddProp = async (prop: Omit<PropAsset, "id">) => {
    const newProp: PropAsset = {
      ...prop,
      id: `prop-${Date.now()}`
    };
    setProps(prev => [...prev, newProp]);
    if (userId) {
      try {
        await saveProp(userId, newProp);
      } catch (e) {
        console.error("Error saving prop to cloud:", e);
      }
    }
  };

  const handleAddLocation = async (loc: Omit<LocationAsset, "id">) => {
    const newLoc: LocationAsset = {
      ...loc,
      id: `loc-${Date.now()}`
    };
    setLocations(prev => [...prev, newLoc]);
    if (userId) {
      try {
        await saveLocation(userId, newLoc);
      } catch (e) {
        console.error("Error saving location to cloud:", e);
      }
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    if (userId) {
      try {
        await deleteCharacter(userId, id);
      } catch (e) {
        console.error("Error deleting character from cloud:", e);
      }
    }
  };

  const handleDeleteProp = async (id: string) => {
    setProps(prev => prev.filter(p => p.id !== id));
    if (userId) {
      try {
        await deleteProp(userId, id);
      } catch (e) {
        console.error("Error deleting prop from cloud:", e);
      }
    }
  };

  const handleDeleteLocation = async (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    if (userId) {
      try {
        await deleteLocation(userId, id);
      } catch (e) {
        console.error("Error deleting location from cloud:", e);
      }
    }
  };

  const handleAddReferenceFrame = async (frame: Omit<ReferenceFrameAsset, "id">) => {
    const newFrame: ReferenceFrameAsset = {
      ...frame,
      id: `frame-${Date.now()}`
    };
    setReferenceFrames(prev => [...prev, newFrame]);
    if (userId) {
      try {
        await saveReferenceFrame(userId, newFrame);
      } catch (e) {
        console.error("Error saving reference frame to cloud:", e);
      }
    }
  };

  const handleDeleteReferenceFrame = async (id: string) => {
    setReferenceFrames(prev => prev.filter(f => f.id !== id));
    if (userId) {
      try {
        await deleteReferenceFrame(userId, id);
      } catch (e) {
        console.error("Error deleting reference frame from cloud:", e);
      }
    }
  };

  // Quick Setup: Persistencia Studio Family Characters with Shared Reference Image
  const setupPersistenciaFamily = async (sharedImageUrl: string) => {
    if (!sharedImageUrl) {
      alert("Por favor proporciona una URL de imagen válida.");
      return;
    }

    // Clear existing characters (optional - comment out if you want to keep existing ones)
    // setCharacters([]);

    const familyCharacters = [
      {
        name: "Tomas",
        description: "Adult male in blue overalls, orange glasses, black afro, tool belt, father figure",
        avatarUrl: sharedImageUrl
      },
      {
        name: "Lia",
        description: "Young girl with long black hair, flower accessory, turquoise dress",
        avatarUrl: sharedImageUrl
      },
      {
        name: "Noah",
        description: "Young boy with short brown hair, gray t-shirt, cargo shorts",
        avatarUrl: sharedImageUrl
      },
      {
        name: "Coco",
        description: "Bright green bipedal iguana, walks on two legs, orange backpack",
        avatarUrl: sharedImageUrl
      }
    ];

    // Add all characters sequentially
    for (const char of familyCharacters) {
      await handleAddCharacter(char);
      // Small delay to ensure sequential IDs
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    alert(`✅ ¡Listo! Se han agregado los 4 personajes de Persistencia usando 1 sola imagen de referencia.\n\nAhora puedes usar @Tomas, @Lia, @Noah, @Coco en tus prompts.`);
  };

  // Auto-setup Isla location with multi-angle reference image
  const setupIslaLocation = async () => {
    const islaImageUrl = "https://bd.persistenciadigital.com/storage/v1/object/public/video-assets/reference-frames/isla.png";
    
    const islaLocation = {
      name: "Isla",
      description: "Small tropical island with white sand beach, turquoise crystal water, tall palm trees, wooden dock, rustic cabin, volcanic rocks. Multi-angle reference showing aerial view, front beach view, cabin detail, and coastline. Perfect for adventure stories and beach scenes.",
      imageUrl: islaImageUrl
    };

    await handleAddLocation(islaLocation);
    console.log("✅ Isla location auto-configured with multi-angle reference image");
  };

  // 10. Handler to insert asset handle at cursor in composer
  const handleInsertAssetHandle = (handle: string) => {
    const textarea = document.getElementById("prompt-textarea") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = promptText.substring(0, start);
      const after = promptText.substring(end, promptText.length);

      const spaceBefore = before.endsWith(" ") || before === "" ? "" : " ";
      const spaceAfter = after.startsWith(" ") || after === "" ? "" : " ";

      const newText = before + spaceBefore + handle + spaceAfter + after;
      setPromptText(newText);

      setTimeout(() => {
        textarea.focus();
        const cursorPosition = start + spaceBefore.length + handle.length + spaceAfter.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      }, 0);
    } else {
      setPromptText(prev => prev ? `${prev} ${handle}` : handle);
    }
  };

  // 11. Core Generation Request with Rate Limit Handling
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const executeGenerationWithRetry = async (
    input: GenerationInput,
    model: string,
    sceneTitle?: string,
    clipNumber?: number,
    retryCount: number = 0
  ): Promise<boolean> => {
    const maxRetries = 3;
    const fetchTimeout = 30000; // 30 seconds timeout
    
    console.log(`[Generation] Attempt ${retryCount + 1}/${maxRetries + 1}: Sending request to /api/seedance/generations`);
    
    // DEBUG: Log the exact image_urls being sent
    if (input.image_urls && input.image_urls.length > 0) {
      console.log('[API REQUEST - Image URLs Order]');
      input.image_urls.forEach((url, idx) => {
        console.log(`  [Image${idx + 1}] ${url}`);
      });
    }
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error(`[Generation] Request timeout after ${fetchTimeout/1000}s`);
        controller.abort();
      }, fetchTimeout);
      
      const res = await fetch(`${API_BASE_URL}/api/seedance/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model, input }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[Generation] Response received:`, { status: res.status, ok: res.ok });

      const data = await res.json();
      console.log(`[Generation] Response data:`, data);

      // Update rate limit info from response if present
      if (data.rate_limit) {
        setRateLimitInfo({
          currentUsage: data.rate_limit.current_usage || 0,
          limit: data.rate_limit.limit || 5,
          resetTime: data.rate_limit.reset_time || "",
          secondsUntilReset: data.rate_limit.seconds_until_reset || 0
        });
      }

      if (res.status === 429 && retryCount < maxRetries) {
        const waitSeconds = data.details?.seconds_until_reset || (2 ** retryCount) * 5;
        
        // Only auto-retry if wait time is reasonable (<= 60 seconds)
        if (waitSeconds <= 60) {
          const waitMs = waitSeconds * 1000;
          console.log(`[Rate Limit] Auto-retry ${retryCount + 1}/${maxRetries} after ${waitSeconds}s`);
          setErrorNotification(`Rate limit alcanzado. Reintentando automáticamente en ${waitSeconds}s...`);
          await sleep(waitMs);
          return executeGenerationWithRetry(input, model, sceneTitle, clipNumber, retryCount + 1);
        } else {
          // Wait time too long - don't auto-retry, just show error
          console.log(`[Rate Limit] Wait time too long (${waitSeconds}s), not auto-retrying`);
          const errorMsg = extractApiErrorMessage(data, `Rate limit alcanzado. Intenta nuevamente en ${Math.ceil(waitSeconds / 60)} minutos.`);
          setErrorNotification(errorMsg);
          return false;
        }
      }

      if (!res.ok) {
        const errorMsg = extractApiErrorMessage(data, `Request failed with status ${res.status}`);
        if (res.status === 401 || errorMsg.toLowerCase().includes("api key") || errorMsg.toLowerCase().includes("unauthorized") || errorMsg.toLowerCase().includes("invalid")) {
          setErrorNotification("Clave de API no válida o desautorizada. Por favor, verifica tu clave en el panel de configuración.");
          return false;
        }
        setErrorNotification(errorMsg);
        return false;
      }

      if (data.success && data.taskId) {
        const newTask: VideoTask = {
          id: data.taskId,
          status: "queued",
          created_at: Math.floor(Date.now() / 1000),
          model,
          failed_reason: null,
          input,
          sceneTitle,
          clipNumber,
          data: null
        };
        setTasks(prev => [newTask, ...prev]);
        startPollingTask(data.taskId, userId);
        return true;
      }

      setErrorNotification("Respuesta inesperada del servidor.");
      return false;
    } catch (err: any) {
      // Handle abort/timeout errors
      if (err.name === 'AbortError') {
        console.error(`[Request Timeout] Request took longer than ${fetchTimeout/1000}s`);
        if (retryCount < maxRetries) {
          const waitMs = (2 ** retryCount) * 2000;
          console.log(`[Timeout] Retry ${retryCount + 1}/${maxRetries} after ${Math.ceil(waitMs / 1000)}s`);
          setErrorNotification(`Timeout de conexión. Reintentando en ${Math.ceil(waitMs / 1000)}s...`);
          await sleep(waitMs);
          return executeGenerationWithRetry(input, model, sceneTitle, clipNumber, retryCount + 1);
        }
        setErrorNotification("La solicitud tardó demasiado tiempo. Verifica tu conexión a internet o intenta más tarde.");
        return false;
      }
      
      // Handle other network errors
      if (retryCount < maxRetries) {
        const waitMs = (2 ** retryCount) * 2000;
        console.log(`[Network Error] Retry ${retryCount + 1}/${maxRetries} after ${Math.ceil(waitMs / 1000)}s`);
        setErrorNotification(`Error de red. Reintentando en ${Math.ceil(waitMs / 1000)}s...`);
        await sleep(waitMs);
        return executeGenerationWithRetry(input, model, sceneTitle, clipNumber, retryCount + 1);
      }
      
      setErrorNotification(err.message || "Error de red. Verifica tu conexión e intenta de nuevo.");
      return false;
    }
  };

  const handleGenerateVideo = async (
    input: GenerationInput, 
    model: string,
    sceneTitle?: string,
    clipNumber?: number
  ) => {
    setIsGenerating(true);
    setErrorNotification(null);

    try {
      // ── Universal 3-min spacing before every request ──
      const now = Date.now();
      const elapsed = now - lastGenerationTime.current;
      const waitMs = Math.max(0, GENERATION_SPACING_MS - elapsed);

      if (waitMs > 0) {
        let remaining = Math.ceil(waitMs / 1000);
        setQueueCountdown(remaining);
        const countdownInterval = setInterval(() => {
          remaining--;
          setQueueCountdown(remaining);
          if (remaining <= 0) clearInterval(countdownInterval);
        }, 1000);
        await sleep(waitMs);
        clearInterval(countdownInterval);
        setQueueCountdown(0);
      }

      // ── Mark generation time ONLY when the request is actually sent ──
      // Not before — if the request fails (401, validation, network error),
      // the countdown should NOT fire on the next attempt.
      // The rate-limit is enforced server-side; client spacing is just a safety buffer.

      const success = await executeGenerationWithRetry(input, model, sceneTitle, clipNumber, 0);

      if (!success) {
        console.log("[Generation] Failed after retries");
        return;
      }

      // Success: record timestamp so the next generation waits 3 min
      lastGenerationTime.current = Date.now();

      // On success, update UI state
      setSelectedTaskId(tasks[0]?.id || "");
      setActiveTab("studio");
      setSuccessToast("New video generation queued successfully! Watch render progress below.");
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      console.error("[Generation] Unexpected error:", err);
      setErrorNotification(err.message || "Error inesperado al generar el video. Por favor, intenta de nuevo.");
    } finally {
      // ALWAYS reset isGenerating, even if there's an error
      setIsGenerating(false);
    }
  };

  // 12. Replay/Reload configuration back into prompt workspace
  const handleReplayTask = (task: VideoTask) => {
    if (!task.input) return;
    setActiveReplayTask(task);
    setPromptText(task.input.prompt);
    setLastUsedSeed(task.input.seed);
    
    const composer = document.getElementById("prompt-textarea");
    if (composer) {
      composer.scrollIntoView({ behavior: "smooth" });
    }

    setSuccessToast("Configuración del video copiada al Composer.");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // 12.5 Frame Extraction function
  const handleExtractFrame = async (task: VideoTask, frameType: "start" | "end") => {
    const videoUrl = task.data?.results?.[0];
    if (!videoUrl) {
      setErrorNotification("No hay URL de video disponible para extraer frames.");
      return;
    }

    setExtractingTaskId(`${task.id}-${frameType}`);
    try {
      let extractedUrl = "";

      // Fallback for end frame if last_frame_url exists in database
      if (frameType === "end" && task.data?.last_frame_url) {
        extractedUrl = task.data.last_frame_url;
      } else {
        // Run HTML5 Canvas video frame extraction
        extractedUrl = await new Promise<string>((resolve, reject) => {
          const video = document.createElement("video");
          video.crossOrigin = "anonymous";
          // Use our robust server-side CORS proxy route to guarantee video loading on canvas
          video.src = `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`;
          video.preload = "auto";
          video.muted = true;
          video.playsInline = true;

          const timeout = setTimeout(() => {
            video.onerror = null;
            video.onseeked = null;
            reject(new Error("Timeout cargando el video para la extracción de fotogramas."));
          }, 8000);

          video.onloadedmetadata = () => {
            const seekTime = frameType === "start" ? 0.05 : Math.max(0.1, video.duration - 0.1);
            video.currentTime = seekTime;
          };

          video.onseeked = () => {
            clearTimeout(timeout);
            try {
              let width = video.videoWidth || 640;
              let height = video.videoHeight || 360;
              const MIN_BOUND = 300;
              if (width < MIN_BOUND || height < MIN_BOUND) {
                const ratio = Math.max(MIN_BOUND / width, MIN_BOUND / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
              }
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(video, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                resolve(dataUrl);
              } else {
                reject(new Error("Fallo al obtener el contexto 2D del canvas."));
              }
            } catch (err) {
              reject(err);
            }
          };

          video.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error("No se pudo cargar el video debido a políticas CORS o de red."));
          };
        });
      }

      if (extractedUrl) {
        // 1. Send to Agent (Casting Drawer / Asset Library)
        const frameLabel = frameType === "start" ? "Inicio" : "Final";
        const filename = `Frame ${frameLabel} de Shot ${task.clipNumber || task.id.slice(0, 4)}`;
        await handleAddReferenceFrame({
          name: filename,
          description: `Extraído automáticamente de la generación ${task.id.slice(0, 6)}`,
          imageUrl: extractedUrl
        });

        // 2. Send to Composer (refImageUrls inside PromptBuilderPanel)
        setExtractedRefImage(extractedUrl);

        setSuccessToast(`¡Frame ${frameLabel} extraído con éxito! Agregado a referencias en el Composer y en el panel del Agente.`);
        setTimeout(() => setSuccessToast(null), 5000);
      }
    } catch (err: any) {
      console.warn("HTML5 Frame extraction warning, falling back to using task last_frame_url:", err);
      
      // Fallback: If canvas failed (due to CORS or timeout) but we have a last_frame_url, use it!
      if (task.data?.last_frame_url) {
        const url = task.data.last_frame_url;
        await handleAddReferenceFrame({
          name: `Frame Final de Shot ${task.clipNumber || task.id.slice(0, 4)}`,
          description: `Fotograma clave del render ${task.id.slice(0, 6)}`,
          imageUrl: url
        });
        setExtractedRefImage(url);
        setSuccessToast("Frame extraído con éxito (usando fotograma clave de respaldo de la API). Agregado al Composer y Agente.");
        setTimeout(() => setSuccessToast(null), 5000);
      } else {
        setErrorNotification(`No se pudo extraer el frame: ${err.message || "Por políticas de seguridad del navegador (CORS), no se permite la lectura directa del video."}`);
      }
    } finally {
      setExtractingTaskId(null);
    }
  };

  // 12.7 Add video to continuity context in Composer
  const handleAddToContext = (task: VideoTask) => {
    const videoUrl = task.data?.results?.[0];
    if (!videoUrl) {
      setErrorNotification("No hay URL de video disponible para agregar al contexto.");
      return;
    }
    setActiveContextVideoUrl(videoUrl);
    setSuccessToast("¡Video agregado con éxito como contexto de continuidad en el Composer!");
    setTimeout(() => setSuccessToast(null), 3000);
    setActiveTab("studio");
  };

  const handleDeleteTask = (taskId: string) => {
    setDeleteConfirmTaskId(taskId);
  };

  const executeDeleteTask = async (taskId: string) => {
    try {
      // Optimistically remove from local list
      setTasks(prev => prev.filter(t => t.id !== taskId));

      // 1. Delete from remote API proxy
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      
      await fetch(`${API_BASE_URL}/api/seedance/tasks/${taskId}`, {
        method: "DELETE",
        headers
      });

      // 2. Delete from Firestore if authenticated (non-critical legacy cleanup — never show error to user)
      if (userId) {
        try {
          await deleteTaskDoc(userId, taskId);
        } catch (firestoreErr) {
          console.warn('[Delete] Firestore cleanup failed (non-critical):', firestoreErr);
        }
      }

      setSuccessToast("Video eliminado con éxito.");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error("[Delete Task Error]:", err);
      setErrorNotification(`Error al eliminar el video: ${err.message || err}`);
    }
  };

  // 13. Load AI Director clip settings back into prompt workspace
  const handleLoadClipConfig = (clip: ClipBlueprint) => {
    setPromptText(clip.prompt);
    setCameraSettings({
      pan: clip.cameraSettings.pan as any,
      tilt: clip.cameraSettings.tilt as any,
      zoom: clip.cameraSettings.zoom as any,
      roll: clip.cameraSettings.roll as any,
      speed: clip.cameraSettings.speed as any,
      style: clip.cameraSettings.style as any,
      timeOfDay: clip.cameraSettings.timeOfDay as any,
      motionCurve: clip.cameraSettings.motionCurve as any
    });

    const composer = document.getElementById("prompt-textarea");
    if (composer) {
      composer.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 14. Render a single clip from the AI Director storyboard
  const handleRenderClip = async (clip: ClipBlueprint, parentBlueprint?: SceneBlueprint, customResolution?: "720p" | "1080p") => {
    setErrorNotification(null);
    setRightPanelTab("history");

    // Harvest reference images automatically and sort them in order of appearance in the prompt
    const autoRefImages = harvestAndSortRefImages(clip.prompt, characters, props, locations);

    // Use selected reference frames or fall back to harvested assets
    const selectedRefImages = clip.image_urls && clip.image_urls.length > 0
      ? clip.image_urls
      : autoRefImages;

    // Continuity logic: find the previous clip's completed video URL in the user's tasks history
    let previousClipVideoUrl: string | null = null;
    if (clip.clipNumber > 1 && parentBlueprint) {
      const prevClip = parentBlueprint.clips.find(c => c.clipNumber === clip.clipNumber - 1);
      if (prevClip) {
        const prevAutoRefImages = harvestAndSortRefImages(prevClip.prompt, characters, props, locations);
        const prevSelectedRefImages = prevClip.image_urls && prevClip.image_urls.length > 0
          ? prevClip.image_urls
          : prevAutoRefImages;

        const { compiled: compiledPrevPrompt } = compileFinalPrompt(
          prevClip.prompt,
          characters,
          props,
          locations,
          prevClip.cameraSettings as any,
          prevSelectedRefImages
        );

        // Find the most recently completed task for this previous prompt, prioritizing precise metadata, falling back to prompt text matching
        const matchingTask = tasks.find(t => {
          const isCompleted = t.status === "completed" && t.data?.results && t.data.results.length > 0;
          if (!isCompleted) return false;

          // Match by precise scene & shot number metadata first
          if (t.sceneTitle === parentBlueprint.sceneTitle && t.clipNumber === prevClip.clipNumber) {
            return true;
          }

          // Fallback to fuzzy prompt matching
          return (
            t.input?.prompt === compiledPrevPrompt || 
            (t.input?.prompt && t.input.prompt.includes(prevClip.prompt)) || 
            (t.input?.prompt && prevClip.prompt.includes(t.input.prompt))
          );
        });

        if (matchingTask?.data?.results?.[0]) {
          previousClipVideoUrl = matchingTask.data.results[0];
          console.log("[Continuity] Encontrado video anterior para continuidad:", previousClipVideoUrl);

          setSuccessToast(`¡Continuidad activada! Usando video del Shot ${clip.clipNumber - 1} como referencia.`);
          setTimeout(() => setSuccessToast(null), 4000);
        } else {
          console.log("[Continuity] No se encontró un render completado para el Shot anterior:", prevClip.title);
        }
      }
    }

    // If the clip has a manually selected continuity video (from ScriptPanel), use it
    const manualVideoUrl = (clip as any).video_urls?.[0] || null;
    const effectiveVideoUrl = manualVideoUrl || previousClipVideoUrl;

    // Also check if the previous task has a last_frame_url for frame-exact continuity
    let previousClipFrameUrl: string | null = null;
    if (clip.clipNumber > 1 && parentBlueprint) {
      const prevClip = parentBlueprint.clips.find(c => c.clipNumber === clip.clipNumber - 1);
      if (prevClip) {
        const prevTask = tasks.find(t =>
          t.status === "completed" &&
          ((t.sceneTitle === parentBlueprint.sceneTitle && t.clipNumber === prevClip.clipNumber) ||
           (t.input?.prompt && t.input.prompt.includes(prevClip.prompt)))
        );
        if (prevTask?.data?.last_frame_url) {
          previousClipFrameUrl = prevTask.data.last_frame_url;
          console.log("[Continuity] ✅ Usando last_frame_url del Shot anterior como inicio exacto:", previousClipFrameUrl);
        }
      }
    }

    // When we have the previous clip's last frame, use it as the leading image reference
    // so the new clip STARTS from exactly that frame
    const effectiveImages = previousClipFrameUrl
      ? [previousClipFrameUrl]  // last frame as sole starting point
      : selectedRefImages;

    const promptLower = clip.prompt.toLowerCase();
    const isSpanishPrompt = /[áéíóúñ¿¡]/.test(clip.prompt) || promptLower.includes(' en ') || promptLower.includes(' de ');

    // Detect if @Isla / island location is mentioned in the prompt
    const mentionsIsla = promptLower.includes('@isla') || promptLower.includes('isla') || promptLower.includes('island');

    // Island design anchor — injected when continuity video + @Isla to prevent visual drift
    const islaAnchor = (effectiveVideoUrl && mentionsIsla)
      ? (isSpanishPrompt
          ? "[🏝️ DISEÑO FIJO DE LA ISLA — TODOS ESTOS ELEMENTOS SIEMPRE IGUALES: playa arena blanca, agua turquesa con arrecife coral visible, palmeras y árboles tropicales. MUELLE: tablones madera marrón ~15m con NEUMÁTICOS NEGROS COLGADOS en los pilotes como amortiguadores (OBLIGATORIO). BARCA AZUL pequeña junto al muelle. CABAÑA: pequeña de madera oscura con techo a dos aguas. BANCO/MESÓN DE MADERA AMARILLO en la playa. Rocas grises en la orilla. PROHIBIDO cambiar cualquiera de estos elementos entre planos.] "
          : "[🏝️ FIXED ISLAND DESIGN — ALL THESE ELEMENTS ALWAYS IDENTICAL: white sand beach, turquoise water with visible coral reef, palm trees and tropical trees. DOCK: brown wooden planks ~15m with BLACK RUBBER TIRES HANGING on posts as bumpers (MANDATORY). SMALL BLUE BOAT next to dock. CABIN: small dark wood with peaked roof. YELLOW WOODEN BENCH/TABLE on beach. Grey rocks on shore. FORBIDDEN to change any of these elements between shots.] ")
      : "";

    // Continuity frame prefix when we have exact last frame
    const frameContinuityPrefix = previousClipFrameUrl
      ? "[🎬 CONTINUIDAD EXACTA: Esta escena comienza EXACTAMENTE desde el último fotograma del plano anterior (Imagen1 = último frame). Mantén personajes, vestuario, iluminación y estilo visual idénticos. Continuación directa sin salto temporal.]  "
      : "";

    // Add video reference instruction to prompt when continuity video is used
    const videoInstruction = effectiveVideoUrl
      ? (isSpanishPrompt
          ? "[🎬 CONTINUIDAD: Usa el video de referencia [Video1] como contexto visual. Mantén exactamente los mismos personajes, vestuario, iluminación, estilo visual y arquitectura del video anterior. Esta escena es la continuación temporal directa del plano anterior.]  "
          : "[🎬 CONTINUITY: Use reference video [Video1] as visual context. Maintain exactly the same characters, costumes, lighting, visual style and architecture from the previous video. This scene is the direct temporal continuation of the previous shot.]  ")
      : "";

    const { compiled: compiledPrompt } = compileFinalPrompt(
      frameContinuityPrefix + islaAnchor + videoInstruction + clip.prompt,
      characters,
      props,
      locations,
      clip.cameraSettings as any,
      effectiveImages,
      !!effectiveVideoUrl
    );

    const finalGenType: GenerationMode = (effectiveImages.length > 0 || effectiveVideoUrl)
      ? "reference-to-video"
      : "text-to-video";

    const inputPayload: GenerationInput = {
      prompt: compiledPrompt,
      generation_type: finalGenType,
      duration: clip.duration,
      aspect_ratio: "16:9",
      resolution: customResolution || "1080p",
      generate_audio: clip.generate_audio,
      watermark: false,
      web_search: false,
      return_last_frame: false,
      seed: -1,
      ...(effectiveImages.length > 0 ? { image_urls: effectiveImages.slice(0, 9) } : {}),
      ...(effectiveVideoUrl ? { video_urls: [effectiveVideoUrl] } : {})
    };

    await handleGenerateVideo(inputPayload, model, parentBlueprint?.sceneTitle, clip.clipNumber);
  };

  // 15. Render all clips in parallel in a scene storyboard
  const handleRenderScene = async (blueprint: SceneBlueprint, customResolution?: "720p" | "1080p") => {
    setErrorNotification(null);
    setRightPanelTab("history");

    for (const clip of blueprint.clips) {
      // Harvest reference images automatically and sort them in order of appearance in the prompt
      const autoRefImages = harvestAndSortRefImages(clip.prompt, characters, props, locations);

      // Use selected reference frames or fall back to harvested assets
      const selectedRefImages = clip.image_urls && clip.image_urls.length > 0
        ? clip.image_urls
        : autoRefImages;

      const { compiled: compiledPrompt } = compileFinalPrompt(
        clip.prompt,
        characters,
        props,
        locations,
        clip.cameraSettings as any,
        selectedRefImages
      );

      let finalGenType: GenerationMode = "text-to-video";
      if (selectedRefImages.length > 0) {
        finalGenType = "reference-to-video";
      }

      const inputPayload: GenerationInput = {
        prompt: compiledPrompt,
        generation_type: finalGenType,
        duration: clip.duration,
        aspect_ratio: "16:9",
        resolution: customResolution || "1080p",
        generate_audio: clip.generate_audio,
        watermark: false,
        web_search: false,
        return_last_frame: false,
        seed: -1,
        ...(selectedRefImages.length > 0 ? { image_urls: selectedRefImages.slice(0, 9) } : {})
      };

      await handleGenerateVideo(inputPayload, model, blueprint.sceneTitle, clip.clipNumber);
      await new Promise(resolve => setTimeout(resolve, 850));
    }
  };

  // 15b. Sequentially render all clips in a scene storyboard (with output continuity context)
  const handleRenderSceneSequentially = async (blueprint: SceneBlueprint, customResolution?: "720p" | "1080p") => {
    setErrorNotification(null);
    setRightPanelTab("history");
    setIsSequentiallyRendering(true);

    const activeKey = apiKey || "";
    // NOTE: headers deliberately don't include Authorization — the server's multi-key
    // load balancer handles key selection. Passing a client key here would override the
    // managed keys and cause 401 errors if the stored localStorage key is invalid.
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    let lastCompletedVideoUrl: string | null = null;
    let lastCompletedFrameUrl: string | null = null; // último fotograma para continuidad frame-exact

    try {
      for (let i = 0; i < blueprint.clips.length; i++) {
        const clip = blueprint.clips[i];
        
        setSequentialRenderProgress({
          current: i + 1,
          total: blueprint.clips.length,
          status: `Iniciando Shot ${clip.clipNumber}: "${clip.title}"...`
        });

        // Harvest reference images automatically and sort them in order of appearance in the prompt
        const autoRefImages = harvestAndSortRefImages(clip.prompt, characters, props, locations);

        // Use selected reference frames or fall back to harvested assets
        const selectedRefImages = clip.image_urls && clip.image_urls.length > 0
          ? clip.image_urls
          : autoRefImages;

        // ── CONTINUIDAD FRAME-EXACT ──────────────────────────────────────────────
        // Si tenemos el último fotograma del clip anterior, lo usamos como imagen de
        // inicio (image_urls[0]) — el modelo EMPIEZA desde ese fotograma exacto.
        // El video completo del clip anterior va en video_urls como contexto adicional.
        const hasContinuityFrame = !!lastCompletedFrameUrl;
        const continuityImages = hasContinuityFrame
          ? [lastCompletedFrameUrl!]  // sólo el último fotograma como inicio exacto
          : selectedRefImages;
        const continuityPromptPrefix = hasContinuityFrame
          ? "[🎬 CONTINUIDAD EXACTA: Esta escena comienza EXACTAMENTE desde el último fotograma del plano anterior (Imagen1 = último frame del clip previo). Mantén personajes, vestuario, iluminación y estilo visual idénticos al video de referencia. Continuación temporal directa sin salto.]  "
          : "";

        const { compiled: compiledPrompt } = compileFinalPrompt(
          continuityPromptPrefix + clip.prompt,
          characters,
          props,
          locations,
          clip.cameraSettings as any,
          continuityImages,
          !!lastCompletedVideoUrl
        );

        // return_last_frame=true en todos salvo el último → la API devuelve last_frame_url
        // que usamos como imagen de inicio del siguiente clip
        const isLastClip = i === blueprint.clips.length - 1;

        const finalGenType: GenerationMode = (continuityImages.length > 0 || lastCompletedVideoUrl)
          ? "reference-to-video"
          : "text-to-video";

        const inputPayload: GenerationInput = {
          prompt: compiledPrompt,
          generation_type: finalGenType,
          duration: clip.duration,
          aspect_ratio: "16:9",
          resolution: customResolution || "1080p",
          generate_audio: clip.generate_audio,
          watermark: false,
          web_search: false,
          return_last_frame: !isLastClip, // true en todos menos el último → habilita continuidad
          seed: -1,
          ...(continuityImages.length > 0 ? { image_urls: continuityImages.slice(0, 9) } : {}),
          // Video completo del clip anterior como contexto de estilo y personajes
          ...(lastCompletedVideoUrl ? { video_urls: [lastCompletedVideoUrl] } : {})
        };

        setSequentialRenderProgress({
          current: i + 1,
          total: blueprint.clips.length,
          status: `Enviando render de Shot ${clip.clipNumber} a la API de Seedance...`
        });

        const res = await fetch(`${API_BASE_URL}/api/seedance/generations`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: model,
            input: inputPayload
          })
        });

        const data = await res.json();
        if (!res.ok) {
          const errorMsg = extractApiErrorMessage(
            data,
            `Fallo al crear el render para el Shot ${clip.clipNumber}`
          );

          // Note: API key errors now handled by multi-key system
          // Keys are managed exclusively via .env configuration

          throw new Error(errorMsg);
        }

        const taskId = data.taskId;

        const newTask: VideoTask = {
          id: taskId,
          status: "queued",
          created_at: Math.floor(Date.now() / 1000),
          model: model,
          failed_reason: null,
          input: inputPayload,
          sceneTitle: blueprint.sceneTitle,
          clipNumber: clip.clipNumber,
          data: null
        };

        setTasks(prev => [newTask, ...prev]);
        startPollingTask(taskId, userId);

        // Wait/poll for completion of this shot
        setSequentialRenderProgress({
          current: i + 1,
          total: blueprint.clips.length,
          status: `Shot ${clip.clipNumber} ("${clip.title}") está en cola/renderizado. Esperando que finalice para usarlo como contexto de continuidad en el siguiente plano...`
        });

        // Loop wait
        let completedVideoUrl: string | null = null;
        let isDone = false;
        while (!isDone) {
          await new Promise(resolve => setTimeout(resolve, 8000));
          try {
            const statusRes = await fetch(`${API_BASE_URL}/api/seedance/tasks/${taskId}`, { headers });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === "completed" || statusData.status === "failed") {
                // Instantly update local state and Firestore
                await checkTaskStatus(taskId, userId);
                if (statusData.status === "completed") {
                  const results = statusData.data?.results || [];
                  completedVideoUrl = results[0] || null;
                  // Capturar el último fotograma para continuidad frame-exact en el siguiente clip
                  lastCompletedFrameUrl = statusData.data?.last_frame_url || null;
                  if (lastCompletedFrameUrl) {
                    console.log(`[Continuity] ✅ last_frame_url capturado para Shot ${clip.clipNumber} → será inicio exacto del Shot ${clip.clipNumber + 1}`);
                  } else {
                    console.log(`[Continuity] ℹ️ Sin last_frame_url para Shot ${clip.clipNumber} — el modelo usará solo video_urls como contexto`);
                  }
                } else {
                  throw new Error(statusData.failed_reason || "Task failed rendering");
                }
                isDone = true;
              } else {
                setSequentialRenderProgress({
                  current: i + 1,
                  total: blueprint.clips.length,
                  status: `Renderizando Shot ${clip.clipNumber} (${statusData.status})...`
                });
                // Ensure state and Firestore are updated with current intermediate state too
                await checkTaskStatus(taskId, userId);
              }
            }
          } catch (pollingErr: any) {
            console.error("Polling check failed in sequential pipeline:", pollingErr);
            if (pollingErr.message && pollingErr.message.includes("failed")) {
              throw pollingErr;
            }
          }
        }

        lastCompletedVideoUrl = completedVideoUrl;
        
        setSuccessToast(`Shot ${clip.clipNumber} renderizado con éxito!`);
        setTimeout(() => setSuccessToast(null), 3000);
      }

      setSequentialRenderProgress({
        current: blueprint.clips.length,
        total: blueprint.clips.length,
        status: "¡Secuencia completa renderizada con éxito con continuidad temporal!"
      });
      setTimeout(() => setSequentialRenderProgress(null), 10000);

    } catch (err: any) {
      console.error("Sequential rendering stopped due to error:", err);
      setErrorNotification(`Renderizado Secuencial Detenido: ${err.message || "Error desconocido"}`);
    } finally {
      setIsSequentiallyRendering(false);
    }
  };

  // Share Application link handler
  const handleShareApp = () => {
    navigator.clipboard.writeText(window.location.href);
    setSuccessToast("¡Enlace del Workspace de desarrollo copiado!");
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const anyActivePolling = Object.keys(isPollingMap).some(key => isPollingMap[key]);
  const activeTask = tasks.find(t => t.id === selectedTaskId) || tasks[0];

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-on-background font-sans selection:bg-primary-container/30 selection:text-white" id="root-layout">
      
      {/* 1. TOP HEADER APP BAR (Fixed) */}
      <header className="fixed top-0 right-0 left-0 h-16 z-40 flex justify-between items-center px-6 bg-[#121317]/85 backdrop-blur-xl border-b border-[#454933]/30">
        <div className="flex items-center gap-8">
          <h1 className="font-display text-base font-black tracking-tighter text-white truncate flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#d1f025]/10 border border-[#d1f025]/20 flex items-center justify-center">
              <Film className="w-4 h-4 text-[#d1f025]" />
            </span>
            <span className="font-bold tracking-tight text-white">Persistencia Studio</span>
          </h1>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 p-1 bg-black/30 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab("studio")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "studio"
                  ? "bg-[#d1f025] text-black shadow-md"
                  : "text-[#c8c6c5] hover:text-white"
              }`}
            >
              Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("assets")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "assets"
                  ? "bg-[#d1f025] text-black shadow-md"
                  : "text-[#c8c6c5] hover:text-white"
              }`}
            >
              Materiales
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                syncHistoryWithApi(null, true);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-[#d1f025] text-black shadow-md"
                  : "text-[#c8c6c5] hover:text-white"
              }`}
            >
              Historial
            </button>
          </nav>
        </div>

        {/* Toolbar Controls / Actions */}
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => {
              setActiveTab("studio");
              setTimeout(() => {
                const composer = document.getElementById("prompt-textarea");
                if (composer) composer.focus();
              }, 100);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1e1f23] border border-[#454933]/30 hover:bg-[#343539] transition-all text-xs font-bold text-slate-300 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#d1f025]" />
            <span>Subir Ref</span>
          </button>
          
          <button 
            type="button"
            onClick={handleShareApp}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#d1f025] text-black hover:brightness-110 shadow-lg transition-all text-xs font-bold cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartir</span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e1f23] border border-[#454933]/30">
              <User className="w-3.5 h-3.5 text-[#d1f025]" />
              <span className="text-xs font-medium text-slate-300">
                {user?.email || 'Usuario'}
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e1f23] border border-[#454933]/30 hover:bg-[#343539] transition-all text-xs font-medium text-slate-300 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 ml-0 mt-16 flex h-[calc(100vh-4rem-2.5rem)] overflow-hidden bg-background">
        {activeTab === "studio" && (
          <>
            {/* CASTING DRAWER PANEL (Collapsible Left Column) */}
            {isAssetsPanelOpen && (
              <aside className="w-80 bg-surface-container-lowest border-r border-[#454933]/20 flex flex-col shrink-0 animate-fade-in relative z-10">
                <div className="p-4 border-b border-[#454933]/20 flex justify-between items-center bg-[#121317]/50">
                  <span className="text-xs font-black text-white font-display uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#d1f025]" />
                    Materiales y Casting
                  </span>
                  <button 
                    onClick={() => setIsAssetsPanelOpen(false)}
                    className="text-[10px] text-rose-400 hover:underline uppercase cursor-pointer"
                  >
                    Ocultar
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1 bg-black/5">
                  <AssetLibraryPanel
                    characters={characters}
                    props={props}
                    locations={locations}
                    referenceFrames={referenceFrames}
                    onAddCharacter={handleAddCharacter}
                    onAddProp={handleAddProp}
                    onAddLocation={handleAddLocation}
                    onAddReferenceFrame={handleAddReferenceFrame}
                    onDeleteCharacter={handleDeleteCharacter}
                    onDeleteProp={handleDeleteProp}
                    onDeleteLocation={handleDeleteLocation}
                    onDeleteReferenceFrame={handleDeleteReferenceFrame}
                    onInsertAssetHandle={handleInsertAssetHandle}
                    onQuickSetupPersistencia={setupPersistenciaFamily}
                  />
                </div>
              </aside>
            )}

            {/* CENTER STAGE CONTAINER (Video Canvas & Prompt Composer) */}
            <section className="flex-1 flex flex-col min-w-0 bg-[#121317] border-r border-[#454933]/20 relative">
              {/* Notification Banners */}

              {/* Queue countdown — 3 min universal delay */}
              {queueCountdown > 0 && (
                <div className="mx-4 mt-4 bg-[#d1f025]/10 border border-[#d1f025]/30 text-[#d1f025] rounded-xl p-3 flex items-center justify-between animate-fade-in z-20">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full border-2 border-[#d1f025]/40 border-t-[#d1f025] animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-xs font-black tracking-wide">ENVIANDO EN {Math.floor(queueCountdown / 60)}:{String(queueCountdown % 60).padStart(2, '0')}</p>
                      <p className="text-[10px] text-[#d1f025]/60 mt-0.5">3 min entre videos · sin bloqueos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black font-mono">{Math.floor(queueCountdown / 60)}:{String(queueCountdown % 60).padStart(2, '0')}</div>
                    <div className="text-[9px] text-[#d1f025]/50">MIN:SEG</div>
                  </div>
                </div>
              )}

              {errorNotification && (
                <div className="mx-4 mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3 flex items-start justify-between animate-fade-in z-20" id="error-banner">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">{errorNotification}</p>
                  </div>
                  <button onClick={() => setErrorNotification(null)} className="text-rose-400 hover:text-white font-black text-xs px-2">✕</button>
                </div>
              )}

              {successToast && (
                <div className="mx-4 mt-4 bg-[#d1f025]/10 border border-[#d1f025]/25 text-white rounded-xl p-3 flex items-center justify-between animate-fade-in z-20" id="success-banner">
                  <div className="flex gap-2 items-center">
                    <CheckCircle2 className="w-4 h-4 text-primary-container shrink-0" />
                    <p className="text-xs font-bold">{successToast}</p>
                  </div>
                  <button onClick={() => setSuccessToast(null)} className="text-white hover:text-[#d1f025] font-black text-xs px-2">✕</button>
                </div>
              )}

              {/* Rate Limit Info Banner */}
              {rateLimitInfo && rateLimitInfo.currentUsage > 0 && (
                <div className="mx-4 mt-4 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl p-3 flex items-center justify-between animate-fade-in z-20">
                  <div className="flex gap-3 items-center flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono">📊</span>
                      <span className="font-bold">Rate Limit:</span>
                      <span className="font-mono">{rateLimitInfo.currentUsage}/{rateLimitInfo.limit}</span>
                    </div>
                    {rateLimitInfo.secondsUntilReset > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono">⏱️</span>
                        <span>Reinicia en {Math.ceil(rateLimitInfo.secondsUntilReset / 60)} min</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setRateLimitInfo(null)} className="text-blue-300 hover:text-white font-black text-xs px-2">✕</button>
                </div>
              )}

              {/* Multi-Key Load Balancing Monitor */}
              {showMultiKeyMonitor && multiKeyStatus && multiKeyStatus.loadBalancingActive && (
                <div className="mx-4 mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-3 animate-fade-in z-20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="font-mono">🔄</span>
                      <span>Balanceo de Carga Activo</span>
                      <span className="text-emerald-400">{multiKeyStatus.availableKeys}/{multiKeyStatus.totalKeys} Keys Disponibles</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          try {
                            await fetch(`${API_BASE_URL}/api/keys/sync`, { method: 'POST' });
                            await fetchMultiKeyStatus();
                          } catch {}
                        }}
                        className="text-[10px] text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded font-mono transition-colors"
                        title="Sincronizar datos reales de videogenapi.com"
                      >
                        Sync
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await fetch(`${API_BASE_URL}/api/keys/reset`, { method: 'POST' });
                            await fetchMultiKeyStatus();
                          } catch {}
                        }}
                        className="text-[10px] text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded font-mono transition-colors"
                        title="Reiniciar timers de las keys"
                      >
                        Reset
                      </button>
                      <button onClick={() => setShowMultiKeyMonitor(false)} className="text-emerald-300 hover:text-white font-black text-xs px-2">✕</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {multiKeyStatus.keys.map((key: any) => {
                      const isActive = key.isCurrentActive;
                      const isLimit = !key.isAvailable;
                      const isClickable = !isActive && key.isAvailable;
                      const borderColor = isActive ? 'border-[#d1f025]/60' : isLimit ? 'border-rose-500/30' : 'border-emerald-500/20';
                      const bgColor = isActive ? 'bg-[#d1f025]/10' : isLimit ? 'bg-rose-500/5' : 'bg-emerald-500/5';
                      const setActive = async () => {
                        if (!isClickable) return;
                        try {
                          await fetch(`${API_BASE_URL}/api/keys/set-active`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({alias: key.alias}) });
                          await fetchMultiKeyStatus();
                        } catch {}
                      };
                      return (
                      <div
                        key={key.index}
                        onClick={setActive}
                        className={`p-2 rounded-lg border ${bgColor} ${borderColor} transition-all
                          ${isClickable ? 'cursor-pointer hover:border-[#d1f025]/40 hover:bg-[#d1f025]/5' : ''}
                          ${isActive ? 'ring-1 ring-[#d1f025]/30' : ''}`}
                        title={isClickable ? `Click para activar ${key.alias}` : isActive ? 'Key actualmente en uso' : 'Key bloqueada'}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {isActive && <span className="w-2 h-2 rounded-full bg-[#d1f025] animate-pulse shadow-[0_0_6px_#d1f025]"/>}
                            <span className={`font-bold font-mono text-xs ${isActive ? 'text-[#d1f025]' : isClickable ? 'text-white' : ''}`}>{key.alias}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isActive ? 'bg-[#d1f025]/20 text-[#d1f025] font-black' :
                            isLimit ? 'bg-rose-500/20 text-rose-400' :
                            'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {isActive ? '● ACTIVA' : isLimit ? 'LÍMITE' : isClickable ? '↗ ACTIVAR' : 'EN ESPERA'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                          <span>{key.currentUsage}/{key.limit} req</span>
                          {key.resetInSeconds > 0 && (
                            <span className="text-rose-400">
                              ⏱️ {key.resetInSeconds < 120 ? `${key.resetInSeconds}s` : `${Math.ceil(key.resetInSeconds / 60)}min`}
                            </span>
                          )}
                        </div>
                        {key.apiTodayCount !== undefined && (
                          <div className="mt-1 text-[9px] text-gray-600 font-mono">
                            hoy: {key.apiTodayCount} · total: {key.apiTotalCount ?? '?'}
                          </div>
                        )}
                        {key.resetTime && isLimit && (
                          <div className="mt-0.5 text-[9px] text-rose-400/70 font-mono truncate">
                            reset: {key.resetTime?.substring(11,19) || key.resetTime}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cinematic History Renders Feed (Center Main Stage) */}
              <div className="flex-1 flex flex-col p-6 overflow-hidden bg-black/15">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="text-[#d1f025] w-5 h-5" />
                    <h2 className="text-sm font-black uppercase text-white tracking-wider font-display">
                      Historial de Renders de Persistencia
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => syncHistoryWithApi(null, true)}
                      disabled={isSyncingHistory}
                      className="text-[10px] bg-black/40 border border-[#454933]/25 hover:border-[#d1f025]/30 hover:bg-black/60 transition-all px-2.5 py-1 rounded text-gray-400 font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Sincronizar historial con la API"
                    >
                      <RefreshCw className={`w-3 h-3 text-[#d1f025] ${isSyncingHistory ? "animate-spin" : ""}`} />
                      <span>{isSyncingHistory ? "Sincronizando..." : "Sincronizar API"}</span>
                    </button>
                    <div className="text-[10px] bg-black/40 border border-[#454933]/25 px-2.5 py-1 rounded text-gray-400 font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d1f025] animate-pulse" />
                      TOTAL: <span className="text-[#d1f025] font-black">{tasks.length}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1" id="center-history-list">
                  {isFirebaseLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                      <div className="w-10 h-10 border-2 border-[#d1f025]/20 border-t-[#d1f025] rounded-full animate-spin" />
                      <p className="text-xs text-[#c8c6c5] font-mono tracking-widest uppercase animate-pulse">Cargando historial...</p>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="py-24 px-4 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-[#454933]/20 rounded-2xl bg-[#090a0d]/50">
                      <Film className="w-12 h-12 text-gray-600 animate-pulse" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-[#c8c6c5]">No cinematic renders found</h4>
                        <p className="text-xs text-gray-500 max-w-sm leading-relaxed font-sans">
                          Escribe un prompt en el composer de abajo para comenzar a generar secuencias con persistencia temporal.
                        </p>
                      </div>
                    </div>
                  ) : (
                    tasks.map((task, index) => {
                      const isCompleted = task.status === "completed";
                      const isFailed = task.status === "failed";
                      const isPending = task.status === "queued" || task.status === "generating";
                      const videoUrl = task.data?.results?.[0];
                      const polling = isPollingMap[task.id] || false;
                      const isExtractingStart = extractingTaskId === `${task.id}-start`;
                      const isExtractingEnd = extractingTaskId === `${task.id}-end`;
                      const isExpanded = !!expandedTasks[task.id];

                      return (
                        <div 
                          key={task.id} 
                          className={`p-5 rounded-2xl border transition-all space-y-4 shadow-xl ${
                            isCompleted 
                              ? "bg-[#0c0d10] border-white/[0.04] hover:border-[#d1f025]/20" 
                              : isFailed 
                              ? "bg-rose-950/10 border-rose-900/20" 
                              : "bg-[#18191e]/50 border-[#d1f025]/20 animate-pulse"
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-[#d1f025] font-mono bg-[#d1f025]/10 px-2 py-0.5 rounded border border-[#d1f025]/10">
                                SHOT #{tasks.length - index}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                {new Date(task.created_at * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </span>
                              {task.sceneTitle && (
                                <span className="text-[10px] bg-[#1a1b1f] border border-white/5 text-gray-400 px-2 py-0.5 rounded font-medium">
                                  🎬 {task.sceneTitle}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Status Badges */}
                              {isCompleted && (
                                <span className="flex items-center text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Ready
                                </span>
                              )}
                              {isFailed && (
                                <span className="flex items-center text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-wider">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </span>
                              )}
                              {isPending && (
                                <span className="flex items-center text-[10px] font-black text-[#d1f025] bg-[#d1f025]/10 px-2 py-0.5 rounded border border-[#d1f025]/20 uppercase tracking-wider animate-pulse">
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  {task.status === "queued" ? "Queued..." : "Rendering..."}
                                </span>
                              )}

                              {isPending && (
                                <button
                                  onClick={() => checkTaskStatus(task.id)}
                                  disabled={polling}
                                  className="p-1 bg-[#1e1f23] hover:bg-black rounded border border-white/10 transition-all text-gray-300 disabled:opacity-50"
                                  title="Actualizar estado"
                                >
                                  <RefreshCw className={`w-3 h-3 ${polling ? "animate-spin text-[#d1f025]" : ""}`} />
                                </button>
                              )}

                              {isCompleted && videoUrl && (
                                <button
                                  onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                  className={`p-1 px-2.5 rounded border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                                    isExpanded 
                                      ? "bg-[#d1f025]/10 border-[#d1f025]/30 text-[#d1f025]" 
                                      : "bg-[#1e1f23] hover:bg-[#2c2d33] border-white/5 text-gray-300"
                                  }`}
                                  title={isExpanded ? "Ocultar detalles" : "Ver detalles completos"}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-3.5 h-3.5 text-[#d1f025]" />
                                      <span className="hidden sm:inline">Menos</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Detalles</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Interactive Renders and Video Area */}
                          {isCompleted && videoUrl ? (
                            !isExpanded ? (
                              /* COMPACT VIEW: Hover Video Overlay and NO text, only icons */
                              <div className="relative group bg-[#0d0e12] rounded-xl overflow-hidden border border-white/5 aspect-video w-full flex items-center justify-center">
                                <video 
                                  src={videoUrl} 
                                  poster={task.data?.last_frame_url || undefined} 
                                  className="w-full h-full object-cover" 
                                  preload="metadata" 
                                  muted 
                                  loop
                                  playsInline
                                />
                                
                                {/* Hover absolute overlay with NO text, only icons */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExtractFrame(task, "start");
                                    }}
                                    disabled={isExtractingStart || isExtractingEnd}
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#d1f025]/20 backdrop-blur-md flex items-center justify-center text-white hover:text-[#d1f025] border border-white/10 hover:border-[#d1f025]/30 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                                    title="Frame Inicio"
                                  >
                                    {isExtractingStart ? (
                                      <RefreshCw className="w-4 h-4 animate-spin text-[#d1f025]" />
                                    ) : (
                                      <SkipBack className="w-4 h-4 fill-current" />
                                    )}
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExtractFrame(task, "end");
                                    }}
                                    disabled={isExtractingStart || isExtractingEnd}
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#d1f025]/20 backdrop-blur-md flex items-center justify-center text-white hover:text-[#d1f025] border border-white/10 hover:border-[#d1f025]/30 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                                    title="Frame Final"
                                  >
                                    {isExtractingEnd ? (
                                      <RefreshCw className="w-4 h-4 animate-spin text-[#d1f025]" />
                                    ) : (
                                      <SkipForward className="w-4 h-4 fill-current" />
                                    )}
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToContext(task);
                                    }}
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#d1f025]/20 backdrop-blur-md flex items-center justify-center text-white hover:text-[#d1f025] border border-white/10 hover:border-[#d1f025]/30 transition-all cursor-pointer shadow-lg active:scale-95"
                                    title="Agregar al Contexto"
                                  >
                                    <Layers className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPlayingVideoUrl(videoUrl);
                                      setPlayingVideoPoster(task.data?.last_frame_url || null);
                                    }}
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#d1f025]/25 backdrop-blur-md flex items-center justify-center text-white hover:text-[#d1f025] border border-white/10 hover:border-[#d1f025]/40 transition-all cursor-pointer shadow-lg active:scale-95"
                                    title="Reproducir"
                                  >
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                    className="w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500/30 backdrop-blur-md flex items-center justify-center text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer shadow-lg active:scale-95"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedTasks(prev => ({ ...prev, [task.id]: true }));
                                    }}
                                    className="w-10 h-10 rounded-full bg-[#d1f025]/10 hover:bg-[#d1f025]/30 backdrop-blur-md flex items-center justify-center text-[#d1f025] border border-[#d1f025]/20 hover:border-[#d1f025]/40 transition-all cursor-pointer shadow-lg active:scale-95"
                                    title="Ver Más Detalles"
                                  >
                                    <Info className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold text-white border border-white/10">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>1080p</span>
                                </div>
                              </div>
                            ) : (
                              /* DETAILED VIEW - as detailed as the current one */
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                                {/* Left: Inline Video Player */}
                                <div className="md:col-span-7 aspect-video bg-black rounded-xl overflow-hidden border border-white/5 shadow-inner relative group">
                                  <video 
                                    src={videoUrl} 
                                    controls 
                                    preload="metadata"
                                    className="w-full h-full object-contain"
                                    poster={task.data?.last_frame_url || undefined}
                                  />
                                </div>

                                {/* Right: Technical Specs & Multi-Actions */}
                                <div className="md:col-span-5 flex flex-col justify-between h-full space-y-3.5">
                                  <div className="space-y-2">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">Detalles de Render</span>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                      <div className="bg-black/30 border border-white/[0.03] p-1.5 rounded">
                                        <span className="text-gray-500 block">Formato:</span>
                                        <span className="text-white font-bold">{task.input?.aspect_ratio || "16:9"}</span>
                                      </div>
                                      <div className="bg-black/30 border border-white/[0.03] p-1.5 rounded">
                                        <span className="text-gray-500 block">Resolución:</span>
                                        <span className="text-white font-bold">{task.input?.resolution || "1080p"}</span>
                                      </div>
                                      <div className="bg-black/30 border border-white/[0.03] p-1.5 rounded">
                                        <span className="text-gray-500 block">Duración:</span>
                                        <span className="text-white font-bold">{task.input?.duration || 15}s</span>
                                      </div>
                                      <div className="bg-black/30 border border-white/[0.03] p-1.5 rounded">
                                        <span className="text-gray-500 block">Semilla:</span>
                                        <span className="text-white font-bold">{task.input?.seed !== undefined && task.input.seed !== -1 ? task.input.seed : "Random (-1)"}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Frame Extraction Actions */}
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono block">Extraer Referencias</span>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        onClick={() => handleExtractFrame(task, "start")}
                                        disabled={isExtractingStart}
                                        className="flex items-center justify-center gap-1 px-2 py-1.5 bg-[#d1f025]/10 hover:bg-[#d1f025]/20 text-[#d1f025] border border-[#d1f025]/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                                        title="Extraer el fotograma de inicio de este video para usarlo como imagen de referencia en el composer y agente"
                                      >
                                        <Upload className="w-3 h-3 rotate-180" />
                                        <span>{isExtractingStart ? "Capturando..." : "Frame Inicio"}</span>
                                      </button>

                                      <button
                                        onClick={() => handleExtractFrame(task, "end")}
                                        disabled={isExtractingEnd}
                                        className="flex items-center justify-center gap-1 px-2 py-1.5 bg-[#d1f025]/10 hover:bg-[#d1f025]/20 text-[#d1f025] border border-[#d1f025]/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                                        title="Extraer el fotograma final de este video para usarlo como imagen de referencia en el composer y agente"
                                      >
                                        <Upload className="w-3 h-3" />
                                        <span>{isExtractingEnd ? "Capturando..." : "Frame Final"}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Standard File Options */}
                                  <div className="flex gap-2 border-t border-white/[0.04] pt-2">
                                    <button
                                      onClick={() => handleReplayTask(task)}
                                      className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-[#1e1f23] hover:bg-[#343539] text-slate-200 rounded-lg border border-white/5 text-[11px] font-bold transition-all cursor-pointer"
                                      title="Copiar todas las especificaciones y prompt de vuelta al composer para rehacer o tweakear"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-[#d1f025]" />
                                      <span>Tweak in Composer</span>
                                    </button>

                                    <a 
                                      href={videoUrl} 
                                      download={`persistencia-${task.id}.mp4`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-[#d1f025] text-black hover:brightness-110 rounded-lg text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Save</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )
                          ) : isFailed ? (
                            <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-2 text-xs">
                              <div className="flex items-center text-rose-400 font-bold space-x-1.5">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Error de Generación</span>
                              </div>
                              <p className="text-gray-400 text-xs leading-relaxed">
                                {task.failed_reason || "Parámetros inválidos o error en la cola del servidor."}
                              </p>
                              <div className="pt-2 flex justify-end gap-2">
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/25 text-red-400 rounded-lg border border-red-500/20 text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Eliminar</span>
                                </button>
                                <button
                                  onClick={() => handleReplayTask(task)}
                                  className="px-3 py-1.5 bg-[#1e1f23] hover:bg-[#343539] text-gray-300 rounded-lg border border-white/5 text-[10px] font-bold uppercase transition-all"
                                >
                                  Tweak Settings
                                </button>
                                <button
                                  onClick={() => handleReplayTask(task)}
                                  className="px-3 py-1.5 bg-[#d1f025]/10 hover:bg-[#d1f025]/25 text-[#d1f025] rounded-lg border border-[#d1f025]/20 text-[10px] font-bold uppercase transition-all"
                                >
                                  Reintentar Shot
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 bg-black/30 border border-white/[0.02] rounded-xl space-y-3 flex flex-col items-center justify-center">
                              <div className="flex items-center space-x-2 text-[#d1f025]">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span className="text-xs font-bold uppercase tracking-wider font-mono">Renderizando Video en la Nube...</span>
                              </div>
                              <div className="w-full max-w-md bg-black/60 h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <div className="bg-gradient-to-r from-[#d1f025] to-emerald-500 h-full w-2/3 rounded-full animate-pulse animate-infinite" />
                              </div>
                              <p className="text-[10px] text-gray-500 text-center italic max-w-sm">
                                Este proceso tarda de 30 a 60 segundos. Puedes continuar escribiendo o cargando el storyboard de tu siguiente clip.
                              </p>
                            </div>
                          )}

                          {/* Render Specifications / Prompts */}
                          {(!isCompleted || isExpanded) && (
                            <div className="bg-black/30 border border-white/[0.03] p-3 rounded-xl space-y-2">
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono block">Prompt de Renders</span>
                              <p className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap selection:bg-[#d1f025]/20">
                                {task.input?.prompt || "Sin prompt provisto"}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* MULTIMODAL PROMPT EDITOR (Docked at the Bottom) */}
              <div className="p-6 bg-gradient-to-t from-[#121317] via-[#121317]/95 to-transparent pt-8">
                <PromptBuilderPanel
                  characters={characters}
                  props={props}
                  locations={locations}
                  cameraSettings={cameraSettings}
                  onCameraSettingsChange={setCameraSettings}
                  promptText={promptText}
                  setPromptText={setPromptText}
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                  hasEnvApiKey={hasEnvApiKey}
                  showApiKeyPanel={showApiKeyPanel}
                  setShowApiKeyPanel={setShowApiKeyPanel}
                  model={model}
                  setModel={setModel}
                  onGenerate={handleGenerateVideo}
                  isGenerating={isGenerating}
                  lastUsedSeed={lastUsedSeed}
                  onOpenCameraSettings={() => setIsCameraModalOpen(true)}
                  completedVideos={tasks
                    .filter(t => t.status === "completed" && t.data?.results?.[0])
                    .map(t => ({
                      id: t.id,
                      url: t.data!.results![0],
                      prompt: t.input?.prompt || "",
                      sceneTitle: t.sceneTitle || ""
                    }))}
                  activeReplayTask={activeReplayTask}
                  onClearReplayTask={() => setActiveReplayTask(null)}
                  extractedRefImage={extractedRefImage}
                  onClearExtractedRefImage={() => setExtractedRefImage(null)}
                  activeContextVideoUrl={activeContextVideoUrl}
                  onClearActiveContextVideoUrl={() => setActiveContextVideoUrl(null)}
                />
              </div>
            </section>

            {/* RIGHT SIDE PANEL — Script / Guión */}
            <aside className="w-80 bg-[#0e0f12] border-l border-white/8 flex flex-col shrink-0 relative z-10">
              <div className="px-3.5 py-3 border-b border-white/8 bg-[#121317]/80 flex justify-between items-center flex-shrink-0">
                <span className="text-xs font-black text-white font-display uppercase tracking-widest flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#d1f025]" />
                  Guión
                </span>
                {tasks.filter(t => t.status === "queued" || t.status === "generating").length > 0 && (
                  <span className="w-2.5 h-2.5 bg-[#d1f025] rounded-full animate-pulse shadow-[0_0_8px_#d1f025]" title="Renders activos" />
                )}
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <ScriptPanel
                  characters={characters}
                  props={props}
                  locations={locations}
                  referenceFrames={referenceFrames}
                  tasks={tasks}
                  onLoadClipConfig={handleLoadClipConfig}
                  onRenderClip={handleRenderClip}
                  onRenderScene={handleRenderScene}
                  onRenderSceneSequentially={handleRenderSceneSequentially}
                  isSequentiallyRendering={isSequentiallyRendering}
                  sequentialRenderProgress={sequentialRenderProgress}
                />
              </div>
            </aside>
          </>
        )}

        {activeTab === "history" && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#121317]">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <History className="text-[#d1f025] w-5 h-5" />
                    <span>Cinematic Render Outputs</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-sans">Historial completo de tus clips generados en el Workspace</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => syncHistoryWithApi(null, true)}
                    disabled={isSyncingHistory}
                    className="text-xs bg-[#1a1b1f] hover:bg-[#25262c] border border-white/5 px-3 py-1.5 rounded-lg text-gray-400 font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#d1f025] ${isSyncingHistory ? "animate-spin" : ""}`} />
                    <span>{isSyncingHistory ? "Sincronizando..." : "Sincronizar API"}</span>
                  </button>
                  <span className="text-xs bg-[#1a1b1f] border border-white/5 px-3 py-1.5 rounded-lg text-gray-400 font-mono">
                    Generados: <span className="text-[#d1f025] font-bold">{tasks.length}</span>
                  </span>
                </div>
              </div>

              {isFirebaseLoading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <div className="w-10 h-10 border-2 border-[#d1f025]/20 border-t-[#d1f025] rounded-full animate-spin" />
                  <p className="text-xs text-[#c8c6c5] font-mono tracking-widest uppercase animate-pulse">Cargando historial...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-24 px-4 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-[#454933]/20 rounded-2xl bg-[#17181c]/30">
                  <Film className="w-12 h-12 text-gray-600 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#c8c6c5]">No cinematic renders found</h4>
                    <p className="text-xs text-gray-500 max-w-sm leading-relaxed font-sans">
                      Escribe un prompt en la pestaña Studio para comenzar a renderizar clips realistas en alta fidelidad.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("studio")}
                    className="mt-2 px-4 py-2 bg-[#d1f025] text-black font-bold text-xs rounded-lg shadow-md hover:brightness-110 transition-all cursor-pointer"
                  >
                    Ir al Studio
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tasks.map((task) => {
                    const isCompleted = task.status === "completed";
                    const isFailed = task.status === "failed";
                    const isPending = task.status === "queued" || task.status === "generating";
                    const videoUrl = task.data?.results?.[0];
                    const poster = task.data?.last_frame_url || undefined;
                    const isExtractingStart = extractingTaskId === `${task.id}-start`;
                    const isExtractingEnd = extractingTaskId === `${task.id}-end`;

                    return (
                      <div 
                        key={task.id}
                        className="relative group bg-[#1a1b1f] rounded-2xl overflow-hidden border border-white/[0.04] hover:border-[#d1f025]/30 transition-all shadow-xl aspect-video w-full flex items-center justify-center"
                        title={task.input?.prompt ? `"${task.input.prompt}"` : "Generación de video"}
                      >
                        {isCompleted && videoUrl ? (
                          <>
                            <video src={videoUrl} poster={poster} className="w-full h-full object-cover" preload="metadata" muted />
                            
                            {/* Hover absolute overlay with NO text, only icons */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExtractFrame(task, "start");
                                }}
                                disabled={isExtractingStart || isExtractingEnd}
                                className="w-12 h-12 rounded-full bg-white/10 hover:bg-[#d1f025]/20 backdrop-blur-md flex items-center justify-center text-white hover:text-[#d1f025] border border-white/10 hover:border-[#d1f025]/30 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                                title="Frame Inicio"
                              >
                                {isExtractingStart ? (
                                  <RefreshCw className="w-5 h-5 animate-spin text-[#d1f025]" />
                                ) : (
                                  <SkipBack className="w-5 h-5 fill-current" />
                                )}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExtractFrame(task, "end");
                                }}
                                disabled={isExtractingStart || isExtractingEnd}
                                className="w-12 h-12 rounded-full bg-white/10 hover:bg-[#d1f025]/20 backdrop-blur-md flex items-center justify-center text-white hover:text-[#d1f025] border border-white/10 hover:border-[#d1f025]/30 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                                title="Frame Final"
                              >
                                {isExtractingEnd ? (
                                  <RefreshCw className="w-5 h-5 animate-spin text-[#d1f025]" />
                                ) : (
                                  <SkipForward className="w-5 h-5 fill-current" />
                                )}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToContext(task);
                                }}
                                className="w-12 h-12 rounded-full bg-white/10 hover:bg-[#d1f025]/20 backdrop-blur-md flex items-center justify-center text-white hover:text-[#d1f025] border border-white/10 hover:border-[#d1f025]/30 transition-all cursor-pointer shadow-lg active:scale-95"
                                title="Agregar al Contexto"
                              >
                                <Layers className="w-5 h-5" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlayingVideoUrl(videoUrl);
                                  setPlayingVideoPoster(task.data?.last_frame_url || null);
                                }}
                                className="w-12 h-12 rounded-full bg-white/10 hover:bg-[#d1f025]/25 backdrop-blur-md flex items-center justify-center text-white hover:text-[#d1f025] border border-white/10 hover:border-[#d1f025]/40 transition-all cursor-pointer shadow-lg active:scale-95"
                                title="Reproducir"
                              >
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="w-12 h-12 rounded-full bg-red-500/10 hover:bg-red-500/30 backdrop-blur-md flex items-center justify-center text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer shadow-lg active:scale-95"
                                title="Eliminar"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold text-white border border-white/10">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>1080p</span>
                            </div>
                          </>
                        ) : isFailed ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-rose-950/10 space-y-2">
                            <XCircle className="w-8 h-8 text-rose-500" />
                            <span className="text-xs font-bold text-rose-400">Failed</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleReplayTask(task)}
                                className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[10px] font-bold uppercase rounded border border-rose-500/10 cursor-pointer"
                              >
                                Retry
                              </button>
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-[10px] font-bold uppercase rounded border border-red-500/10 cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4">
                            <div className="w-8 h-8 border-2 border-[#d1f025]/30 border-t-[#d1f025] rounded-full animate-spin mb-3" />
                            <span className="text-xs font-medium text-[#d1f025] animate-pulse uppercase tracking-wider font-mono">Renderizando...</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "assets" && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#121317]">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-display">
                    <Users className="text-[#d1f025] w-5 h-5" />
                    <span>Casting & Assets Console</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-sans">Administra tus personajes, accesorios, ubicaciones y fotogramas de referencia</p>
                </div>
              </div>

              <div className="bg-[#1a1b1f] rounded-2xl border border-white/[0.04] p-6 shadow-xl">
                <AssetLibraryPanel
                  characters={characters}
                  props={props}
                  locations={locations}
                  referenceFrames={referenceFrames}
                  onAddCharacter={handleAddCharacter}
                  onAddProp={handleAddProp}
                  onAddLocation={handleAddLocation}
                  onAddReferenceFrame={handleAddReferenceFrame}
                  onDeleteCharacter={handleDeleteCharacter}
                  onDeleteProp={handleDeleteProp}
                  onDeleteLocation={handleDeleteLocation}
                  onDeleteReferenceFrame={handleDeleteReferenceFrame}
                  onInsertAssetHandle={handleInsertAssetHandle}
                  onQuickSetupPersistencia={setupPersistenciaFamily}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. BOTTOM FOOTER STATUS BAR (Fixed) */}
      <footer className="fixed bottom-0 right-0 left-0 h-10 z-40 flex justify-between items-center px-6 bg-[#0d0e12]/90 backdrop-blur-md border-t border-[#454933]/30 text-xs text-[#c8c6c5]">
        <div className="font-mono text-[10px] text-[#71717A] flex items-center gap-2">
          <span>© 2026 Persistencia Studio. Todos los derechos reservados.</span>
        </div>
        <div className="flex gap-6 font-mono text-[10px]">
          <span className="text-[#d1f025] font-black flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${anyActivePolling ? "bg-[#d1f025] animate-pulse" : "bg-emerald-500"}`}></span>
            <span>Estado: {anyActivePolling ? "Renderizando (Active Queue Polling)" : "Estudio Listo"}</span>
          </span>
          <a className="text-[#71717A] hover:text-white transition-all underline" href="#help">Soporte Técnico</a>
        </div>
      </footer>

      {/* CAMERA PARAMETERS OVERLAY MODAL */}
      <CameraOverlay
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        settings={cameraSettings}
        onChange={setCameraSettings}
      />

      {/* PLAYING CINEMATIC VIDEO POPUP MODAL */}
      {playingVideoUrl && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[999] flex flex-col items-center justify-center p-4 md:p-8"
          onClick={() => setPlayingVideoUrl(null)}
        >
          <div 
            className="relative max-w-4xl w-full aspect-video bg-black rounded-2xl border border-[#d1f025]/30 overflow-hidden shadow-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <video 
              src={playingVideoUrl} 
              poster={playingVideoPoster || undefined} 
              controls 
              autoPlay 
              className="w-full h-full object-contain" 
            />
            <button 
              onClick={() => setPlayingVideoUrl(null)} 
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border border-white/10 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {deleteConfirmTaskId && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[1000] flex items-center justify-center p-4"
          onClick={() => setDeleteConfirmTaskId(null)}
        >
          <div 
            className="bg-[#121316] border border-red-500/30 p-6 rounded-2xl max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>¿Eliminar este video?</span>
            </h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Esta acción eliminará permanentemente el video del historial de la base de datos y del servidor de renderizado. No se puede deshacer.
            </p>
            <div className="flex justify-end gap-3 font-medium text-xs">
              <button
                onClick={() => setDeleteConfirmTaskId(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const id = deleteConfirmTaskId;
                  setDeleteConfirmTaskId(null);
                  executeDeleteTask(id);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg border border-red-500/20 transition-all cursor-pointer shadow-lg shadow-red-950/50"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
