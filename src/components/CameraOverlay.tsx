/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CameraSettings, CameraStyle, CameraPan, CameraTilt, CameraZoom, CameraRoll, CameraSpeed } from "../types";
import { X, Tv, Compass, Video, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, RotateCcw, Sliders, Play } from "lucide-react";
import { compileCameraPrompt } from "../utils";

interface CameraOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CameraSettings;
  onChange: (settings: CameraSettings) => void;
}

export default function CameraOverlay({
  isOpen,
  onClose,
  settings,
  onChange
}: CameraOverlayProps) {
  if (!isOpen) return null;

  const updateSetting = <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  const cameraStyles: { value: CameraStyle; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: "static", label: "Static Shot", desc: "Locked-down tripod", icon: <Tv className="w-5 h-5 text-gray-400" /> },
    { value: "drone", label: "Drone Flyover", desc: "Aerial perspective", icon: <Compass className="w-5 h-5 text-sky-400" /> },
    { value: "handheld", label: "Handheld", desc: "Real documentary shake", icon: <Video className="w-5 h-5 text-emerald-400" /> },
    { value: "dolly", label: "Dolly Track", desc: "Smooth track-in moves", icon: <ArrowUp className="w-5 h-5 text-purple-400" /> },
    { value: "crane", label: "Crane Shot", desc: "Vertical sweep high-angle", icon: <ArrowDown className="w-5 h-5 text-amber-400" /> },
    { value: "orbit", label: "Orbit 360°", desc: "Orbital wrap-around", icon: <Compass className="w-5 h-5 text-rose-400" /> },
    { value: "fpv", label: "FPV Racing", desc: "Fast dynamic action weave", icon: <Compass className="w-5 h-5 text-yellow-400" /> },
    { value: "panoramic", label: "Panoramic", desc: "Ultra-wide scenic sweep", icon: <Compass className="w-5 h-5 text-indigo-400" /> },
  ];

  const cameraPans: { value: CameraPan; label: string; icon: React.ReactNode }[] = [
    { value: "none", label: "No Pan", icon: <span className="text-[10px]">NONE</span> },
    { value: "left", label: "Pan Left", icon: <ArrowLeft className="w-4 h-4" /> },
    { value: "right", label: "Pan Right", icon: <ArrowRight className="w-4 h-4" /> },
  ];

  const cameraTilts: { value: CameraTilt; label: string; icon: React.ReactNode }[] = [
    { value: "none", label: "No Tilt", icon: <span className="text-[10px]">NONE</span> },
    { value: "up", label: "Tilt Up", icon: <ArrowUp className="w-4 h-4" /> },
    { value: "down", label: "Tilt Down", icon: <ArrowDown className="w-4 h-4" /> },
  ];

  const cameraZooms: { value: CameraZoom; label: string; icon: React.ReactNode }[] = [
    { value: "none", label: "No Zoom", icon: <span className="text-[10px]">NONE</span> },
    { value: "in", label: "Zoom In", icon: <span className="text-xs font-bold">IN</span> },
    { value: "out", label: "Zoom Out", icon: <span className="text-xs font-bold">OUT</span> },
  ];

  const cameraRolls: { value: CameraRoll; label: string; icon: React.ReactNode }[] = [
    { value: "none", label: "No Roll", icon: <span className="text-[10px]">NONE</span> },
    { value: "clockwise", label: "Clockwise", icon: <RotateCw className="w-4 h-4" /> },
    { value: "counter_clockwise", label: "Counter C.", icon: <RotateCcw className="w-4 h-4" /> },
  ];

  const cameraSpeeds: CameraSpeed[] = ["slow", "normal", "fast"];

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl glass-panel rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-[#454933]/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-[#454933]/30 flex justify-between items-center bg-[#121317]/95 rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-primary-container/10 text-[#d1f025] rounded-lg">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-black text-white tracking-tight">Camera Settings & Tracks</h3>
              <p className="text-[10px] text-[#c6c9ad] font-mono uppercase tracking-widest">Higgsfield-style motion parameters</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#343539] hover:bg-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-4 gap-6 bg-gradient-to-b from-[#1e1f23]/50 to-[#121317]">
          {/* Camera Style */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <span className="text-[10px] font-bold text-[#c8c6c5] uppercase tracking-widest font-mono">Camera Cinematic Style</span>
            <div className="grid grid-cols-2 gap-2.5">
              {cameraStyles.map((style) => {
                const isActive = settings.style === style.value;
                return (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => updateSetting("style", style.value)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between h-24 cursor-pointer relative overflow-hidden group ${
                      isActive
                        ? "bg-primary-container/10 border-[#d1f025] shadow-[0_0_15px_rgba(209,240,37,0.1)] text-white"
                        : "bg-[#1e1f23]/50 border-[#454933]/30 hover:border-[#d1f025]/50 text-[#c8c6c5]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      {style.icon}
                      {isActive && <span className="w-2 h-2 rounded-full bg-[#d1f025]" />}
                    </div>
                    <div>
                      <span className="text-xs font-black block text-white group-hover:text-[#d1f025] transition-colors">{style.label}</span>
                      <span className="text-[9px] text-[#71717A] block leading-tight mt-0.5">{style.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Camera Tracks / Movements */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <span className="text-[10px] font-bold text-[#c8c6c5] uppercase tracking-widest font-mono">Track Parameters & Direction</span>
            
            <div className="space-y-4 bg-[#1e1f23]/40 border border-[#454933]/20 p-4 rounded-xl">
              {/* Pan */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Pan (Horizontal Sweep)</span>
                <div className="grid grid-cols-3 gap-1.5 bg-[#0d0e12] p-1 rounded-lg">
                  {cameraPans.map((p) => {
                    const isActive = settings.pan === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => updateSetting("pan", p.value)}
                        className={`py-1.5 px-2 rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-all ${
                          isActive
                            ? "bg-[#d1f025]/10 border border-[#d1f025]/30 text-[#d1f025] font-bold"
                            : "text-[#71717A] hover:text-[#e3e2e7] border border-transparent"
                        }`}
                      >
                        {p.icon}
                        <span className="text-[9px] uppercase">{p.value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tilt */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Tilt (Vertical Sweep)</span>
                <div className="grid grid-cols-3 gap-1.5 bg-[#0d0e12] p-1 rounded-lg">
                  {cameraTilts.map((t) => {
                    const isActive = settings.tilt === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => updateSetting("tilt", t.value)}
                        className={`py-1.5 px-2 rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-all ${
                          isActive
                            ? "bg-[#d1f025]/10 border border-[#d1f025]/30 text-[#d1f025] font-bold"
                            : "text-[#71717A] hover:text-[#e3e2e7] border border-transparent"
                        }`}
                      >
                        {t.icon}
                        <span className="text-[9px] uppercase">{t.value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Zoom */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Zoom (In / Out)</span>
                <div className="grid grid-cols-3 gap-1.5 bg-[#0d0e12] p-1 rounded-lg">
                  {cameraZooms.map((z) => {
                    const isActive = settings.zoom === z.value;
                    return (
                      <button
                        key={z.value}
                        type="button"
                        onClick={() => updateSetting("zoom", z.value)}
                        className={`py-1.5 px-2 rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-all ${
                          isActive
                            ? "bg-[#d1f025]/10 border border-[#d1f025]/30 text-[#d1f025] font-bold"
                            : "text-[#71717A] hover:text-[#e3e2e7] border border-transparent"
                        }`}
                      >
                        {z.icon}
                        <span className="text-[9px] uppercase">{z.value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Roll */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Roll (Rotational Tilt)</span>
                <div className="grid grid-cols-3 gap-1.5 bg-[#0d0e12] p-1 rounded-lg">
                  {cameraRolls.map((r) => {
                    const isActive = settings.roll === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => updateSetting("roll", r.value)}
                        className={`py-1.5 px-2 rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-all ${
                          isActive
                            ? "bg-[#d1f025]/10 border border-[#d1f025]/30 text-[#d1f025] font-bold"
                            : "text-[#71717A] hover:text-[#e3e2e7] border border-transparent"
                        }`}
                      >
                        {r.icon}
                        <span className="text-[9px] uppercase">{r.value.replace("_", " ")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Speed */}
              <div className="space-y-1.5 border-t border-[#454933]/20 pt-3">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Movement Pacing / Speed</span>
                <div className="grid grid-cols-3 gap-1.5 bg-[#0d0e12] p-1 rounded-lg">
                  {cameraSpeeds.map((sp) => {
                    const isActive = settings.speed === sp;
                    return (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => updateSetting("speed", sp)}
                        className={`py-1.5 px-2 rounded-md flex items-center justify-center cursor-pointer transition-all ${
                          isActive
                            ? "bg-[#d1f025] text-black font-extrabold"
                            : "text-[#71717A] hover:text-[#e3e2e7] border border-transparent"
                        }`}
                      >
                        <span className="text-[10px] uppercase">{sp}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#454933]/20 bg-[#0d0e12] flex items-center justify-between text-xs text-[#71717A]">
          <span className="font-mono text-[10px]">
            COMPILED MOTION TEXT: <span className="text-white italic">"{compileCameraPrompt(settings)}"</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-primary-container text-on-primary-container hover:brightness-110 glow-hover transition-all text-xs font-bold font-display cursor-pointer"
          >
            Apply Movement Track
          </button>
        </div>
      </div>
    </div>
  );
}
