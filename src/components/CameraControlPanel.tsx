/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  CameraSettings, 
  CameraPan, 
  CameraTilt, 
  CameraZoom, 
  CameraRoll, 
  CameraSpeed, 
  CameraStyle,
  TimeOfDay,
  MotionCurve
} from "../types";
import { 
  Video, 
  RotateCw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  Tv, 
  Zap, 
  Gauge,
  Compass,
  Sparkles,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Cloud,
  Waves,
  TrendingUp
} from "lucide-react";
import { compileCameraPrompt } from "../utils";

interface CameraControlPanelProps {
  settings: CameraSettings;
  onChange: (settings: CameraSettings) => void;
}

export default function CameraControlPanel({ settings, onChange }: CameraControlPanelProps) {
  const updateSetting = <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  const timeOfDayOptions: { value: TimeOfDay; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: "dawn", label: "Amanecer", desc: "Luz suave rosa y naranja", icon: <Sunrise className="w-4 h-4 text-pink-400" /> },
    { value: "day", label: "Día", desc: "Luz brillante natural", icon: <Sun className="w-4 h-4 text-yellow-400" /> },
    { value: "afternoon", label: "Tarde", desc: "Luz cálida dorada", icon: <Cloud className="w-4 h-4 text-orange-300" /> },
    { value: "sunset", label: "Atardecer", desc: "Cielo naranja y púrpura", icon: <Sunset className="w-4 h-4 text-orange-500" /> },
    { value: "night", label: "Noche", desc: "Atmósfera nocturna", icon: <Moon className="w-4 h-4 text-blue-300" /> },
  ];

  const cameraStyles: { value: CameraStyle; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: "auto", label: "Auto", desc: "Del prompt del usuario", icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
    { value: "static", label: "Static", desc: "Plano fijo", icon: <Tv className="w-4 h-4" /> },
    { value: "drone", label: "Drone", desc: "Perspectiva aérea", icon: <Compass className="w-4 h-4 text-sky-400" /> },
    { value: "handheld", label: "Handheld", desc: "Cámara en mano", icon: <Video className="w-4 h-4 text-emerald-400" /> },
    { value: "dolly", label: "Dolly", desc: "Travelling suave", icon: <ArrowUp className="w-4 h-4 text-purple-400" /> },
    { value: "crane", label: "Crane", desc: "Grúa vertical", icon: <ArrowDown className="w-4 h-4 text-amber-400" /> },
    { value: "orbit", label: "Orbit", desc: "Giro orbital 360°", icon: <Compass className="w-4 h-4 text-rose-400" /> },
    { value: "fpv", label: "FPV", desc: "Drone acrobático", icon: <Zap className="w-4 h-4 text-yellow-400" /> },
    { value: "panoramic", label: "Panoramic", desc: "Barrido panorámico", icon: <Waves className="w-4 h-4 text-indigo-400" /> },
  ];

  const motionCurveOptions: { value: MotionCurve; label: string; desc: string }[] = [
    { value: "linear", label: "Lineal", desc: "Velocidad constante" },
    { value: "ease-in", label: "Ease In", desc: "Inicia lento, acelera" },
    { value: "ease-out", label: "Ease Out", desc: "Inicia rápido, desacelera" },
    { value: "ease-in-out", label: "Ease In-Out", desc: "Lento → Rápido → Lento" },
  ];

  const compiledText = compileCameraPrompt(settings);

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 shadow-2xl space-y-6 text-text-primary" id="camera-panel">
      <div className="flex items-center justify-between border-b border-dark-border pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#71717A]">Cinema Camera v2</h2>
            <p className="text-[10px] text-text-secondary">Higgsfield-style motion parameters</p>
          </div>
        </div>
        <div className="flex items-center text-[10px] text-slate-400 bg-dark-input px-2 py-1 rounded border border-dark-border">
          <Gauge className="w-3.5 h-3.5 text-orange-400 mr-1" />
          <span>Speed: {settings.speed.toUpperCase()}</span>
        </div>
      </div>

      {/* Speed Dial */}
      <div className="space-y-2">
        <label className="text-[10px] font-medium text-slate-300 block uppercase tracking-wider">Camera Movement Speed</label>
        <div className="grid grid-cols-3 gap-2">
          {(["slow", "normal", "fast"] as CameraSpeed[]).map((sp) => (
            <button
              key={sp}
              id={`speed-${sp}`}
              type="button"
              onClick={() => updateSetting("speed", sp)}
              className={`py-1.5 px-3 rounded text-xs font-medium transition-all ${
                settings.speed === sp
                  ? "bg-orange-600 text-white shadow-md shadow-orange-950/20"
                  : "bg-dark-border hover:bg-[#27272A] border border-[#3F3F46] text-slate-300"
              }`}
            >
              {sp.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 2D Vector Controls (Pan & Tilt) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pan Direction */}
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-slate-300 block uppercase tracking-wider">Pan (Horizontal)</label>
          <div className="flex rounded bg-[#050506] p-1 border border-dark-border">
            {(["none", "left", "right"] as CameraPan[]).map((p) => (
              <button
                key={p}
                id={`pan-${p}`}
                type="button"
                onClick={() => updateSetting("pan", p)}
                className={`flex-1 flex justify-center items-center py-1.5 px-2 rounded text-xs font-medium transition-all ${
                  settings.pan === p
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                    : "text-[#71717A] hover:text-[#E4E4E7] border border-transparent"
                }`}
              >
                {p === "none" && <span className="text-[9px]">NONE</span>}
                {p === "left" && <ArrowLeft className="w-3.5 h-3.5" />}
                {p === "right" && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Tilt Direction */}
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-slate-300 block uppercase tracking-wider">Tilt (Vertical)</label>
          <div className="flex rounded bg-[#050506] p-1 border border-dark-border">
            {(["none", "up", "down"] as CameraTilt[]).map((t) => (
              <button
                key={t}
                id={`tilt-${t}`}
                type="button"
                onClick={() => updateSetting("tilt", t)}
                className={`flex-1 flex justify-center items-center py-1.5 px-2 rounded text-xs font-medium transition-all ${
                  settings.tilt === t
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                    : "text-[#71717A] hover:text-[#E4E4E7] border border-transparent"
                }`}
              >
                {t === "none" && <span className="text-[9px]">NONE</span>}
                {t === "up" && <ArrowUp className="w-3.5 h-3.5" />}
                {t === "down" && <ArrowDown className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zoom & Roll Controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Zoom Direction */}
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-slate-300 block uppercase tracking-wider">Zoom (Depth)</label>
          <div className="flex rounded bg-[#050506] p-1 border border-dark-border">
            {(["none", "in", "out"] as CameraZoom[]).map((z) => (
              <button
                key={z}
                id={`zoom-${z}`}
                type="button"
                onClick={() => updateSetting("zoom", z)}
                className={`flex-1 flex justify-center items-center py-1.5 px-2 rounded text-xs font-medium transition-all ${
                  settings.zoom === z
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                    : "text-[#71717A] hover:text-[#E4E4E7] border border-transparent"
                }`}
              >
                {z === "none" && <span className="text-[9px]">NONE</span>}
                {z === "in" && <ZoomIn className="w-3.5 h-3.5" />}
                {z === "out" && <ZoomOut className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Roll Direction */}
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-slate-300 block uppercase tracking-wider">Roll (Rotation)</label>
          <div className="flex rounded bg-[#050506] p-1 border border-dark-border">
            {(["none", "clockwise", "counter_clockwise"] as CameraRoll[]).map((r) => (
              <button
                key={r}
                id={`roll-${r}`}
                type="button"
                onClick={() => updateSetting("roll", r)}
                className={`flex-1 flex justify-center items-center py-1.5 px-2 rounded text-xs font-medium transition-all ${
                  settings.roll === r
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                    : "text-[#71717A] hover:text-[#E4E4E7] border border-transparent"
                }`}
              >
                {r === "none" && <span className="text-[9px]">NONE</span>}
                {r === "clockwise" && <RotateCw className="w-3.5 h-3.5" />}
                {r === "counter_clockwise" && <RotateCcw className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time of Day - Horario (Animated Series Look) */}
      <div className="space-y-2 border-t border-dark-border pt-4">
        <label className="text-[10px] font-medium text-slate-300 flex items-center justify-between uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Sunrise className="w-4 h-4 text-orange-400" />
            Horario del Día
          </span>
          <span className="text-[9px] text-[#71717A] normal-case">look de la serie</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {timeOfDayOptions.map((tod) => (
            <button
              key={tod.value}
              id={`time-${tod.value}`}
              type="button"
              onClick={() => updateSetting("timeOfDay", tod.value)}
              className={`flex flex-col items-center justify-center p-2.5 rounded border text-center transition-all ${
                settings.timeOfDay === tod.value
                  ? "bg-[#27272A]/80 border-orange-500 text-white ring-1 ring-orange-500/30"
                  : "bg-dark-input/50 border-dark-border text-[#71717A] hover:bg-[#27272A]/40 hover:text-slate-200"
              }`}
            >
              <div className="mb-1.5">{tod.icon}</div>
              <span className={`text-xs font-medium mb-0.5 ${settings.timeOfDay === tod.value ? "text-slate-200" : "text-slate-300"}`}>
                {tod.label}
              </span>
              <span className="text-[9px] text-slate-400 leading-tight">
                {tod.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Camera Movement Style */}
      <div className="space-y-2">
        <label className="text-[10px] font-medium text-slate-300 flex items-center justify-between uppercase tracking-wider">
          <span>Movimiento de Cámara</span>
          <span className="text-[9px] text-[#71717A] normal-case">opcional</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {cameraStyles.map((cs) => (
            <button
              key={cs.value}
              id={`style-${cs.value}`}
              type="button"
              onClick={() => updateSetting("style", cs.value)}
              className={`flex flex-col items-center justify-center p-2 rounded border text-center transition-all ${
                settings.style === cs.value
                  ? "bg-[#27272A]/80 border-orange-500 text-white ring-1 ring-orange-500/30"
                  : "bg-dark-input/50 border-dark-border text-[#71717A] hover:bg-[#27272A]/40 hover:text-slate-200"
              }`}
            >
              <div className="mb-1">{cs.icon}</div>
              <span className={`text-[10px] font-medium ${settings.style === cs.value ? "text-slate-200" : "text-slate-300"}`}>
                {cs.label}
              </span>
              <span className="text-[8px] text-slate-400 leading-tight">
                {cs.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Motion Curve - Curva de Movimiento */}
      <div className="space-y-2">
        <label className="text-[10px] font-medium text-slate-300 flex items-center justify-between uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            Curva de Movimiento
          </span>
          <span className="text-[9px] text-[#71717A] normal-case">ritmo del movimiento</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {motionCurveOptions.map((mc) => (
            <button
              key={mc.value}
              id={`curve-${mc.value}`}
              type="button"
              onClick={() => updateSetting("motionCurve", mc.value)}
              className={`flex flex-col items-start p-2.5 rounded border text-left transition-all ${
                settings.motionCurve === mc.value
                  ? "bg-[#27272A]/80 border-orange-500 text-white ring-1 ring-orange-500/30"
                  : "bg-dark-input/50 border-dark-border text-[#71717A] hover:bg-[#27272A]/40 hover:text-slate-200"
              }`}
            >
              <span className={`text-xs font-medium mb-0.5 ${settings.motionCurve === mc.value ? "text-slate-200" : "text-slate-300"}`}>
                {mc.label}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {mc.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Camera Prompt Prompt Preview */}
      <div className="bg-[#050506] border border-dark-border rounded p-3.5 space-y-1.5 shadow-inner">
        <div className="flex items-center justify-between text-[10px] text-orange-400 uppercase tracking-widest font-semibold">
          <span>Camera Motion Prompt Segment</span>
          <span className="bg-[#1F1F23] px-1.5 py-0.5 rounded text-slate-300 lowercase text-[9px]">auto-applied</span>
        </div>
        <p className="text-xs font-mono text-slate-300 leading-relaxed italic bg-orange-500/5 px-2 py-1.5 rounded border border-orange-500/10">
          {compiledText ? `", ${compiledText}"` : "(No camera motion active)"}
        </p>
      </div>
    </div>
  );
}
