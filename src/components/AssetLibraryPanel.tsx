/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CharacterAsset, PropAsset, LocationAsset, ReferenceFrameAsset, AssetType } from "../types";
import { 
  Users, 
  Sparkles, 
  MapPin, 
  Plus, 
  Trash2, 
  Copy, 
  Search, 
  PlusCircle,
  X,
  HelpCircle,
  Info,
  Upload,
  Image as ImageIcon
} from "lucide-react";
import { getAssetHandle } from "../utils";

interface AssetLibraryPanelProps {
  characters: CharacterAsset[];
  props: PropAsset[];
  locations: LocationAsset[];
  referenceFrames?: ReferenceFrameAsset[];
  onAddCharacter: (char: Omit<CharacterAsset, "id">) => void;
  onAddProp: (prop: Omit<PropAsset, "id">) => void;
  onAddLocation: (loc: Omit<LocationAsset, "id">) => void;
  onAddReferenceFrame?: (frame: Omit<ReferenceFrameAsset, "id">) => void;
  onDeleteCharacter: (id: string) => void;
  onDeleteProp: (id: string) => void;
  onDeleteLocation: (id: string) => void;
  onDeleteReferenceFrame?: (id: string) => void;
  onInsertAssetHandle: (handle: string) => void;
}

export default function AssetLibraryPanel({
  characters,
  props,
  locations,
  referenceFrames = [],
  onAddCharacter,
  onAddProp,
  onAddLocation,
  onAddReferenceFrame,
  onDeleteCharacter,
  onDeleteProp,
  onDeleteLocation,
  onDeleteReferenceFrame,
  onInsertAssetHandle,
}: AssetLibraryPanelProps) {
  const [activeTab, setActiveTab] = useState<AssetType>("character");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resizeAndConvertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Target bounding bounds to satisfy Seedance API requirements (Width/Height must be between 300px and 6000px)
          const MAX_BOUND = 1024;
          const MIN_BOUND = 300;

          // 1. Scale down if too large
          if (width > MAX_BOUND || height > MAX_BOUND) {
            const ratio = Math.min(MAX_BOUND / width, MAX_BOUND / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // 2. Scale up if too small (below 300px on either side)
          if (width < MIN_BOUND || height < MIN_BOUND) {
            const ratio = Math.max(MIN_BOUND / width, MIN_BOUND / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
            resolve(dataUrl);
          } else {
            resolve(reader.result as string);
          }
        };
        img.onerror = () => {
          reject(new Error("Failed to load image"));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        try {
          setIsUploading(true);
          const base64 = await resizeAndConvertToBase64(file);
          setAvatarUrl(base64); // Instant preview
          
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64 })
          });
          if (!res.ok) {
            throw new Error("Upload failed on server");
          }
          const data = await res.json();
          if (data.url) {
            setAvatarUrl(data.url);
          }
        } catch (err: any) {
          console.error("Upload error:", err);
          setUploadError("No se pudo subir la imagen al servidor.");
        } finally {
          setIsUploading(false);
        }
      } else {
        setUploadError("Por favor arrastra un archivo de imagen válido.");
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        try {
          setIsUploading(true);
          const base64 = await resizeAndConvertToBase64(file);
          setAvatarUrl(base64); // Instant preview
          
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64 })
          });
          if (!res.ok) {
            throw new Error("Upload failed on server");
          }
          const data = await res.json();
          if (data.url) {
            setAvatarUrl(data.url);
          }
        } catch (err: any) {
          console.error("Upload error:", err);
          setUploadError("No se pudo subir la imagen al servidor.");
        } finally {
          setIsUploading(false);
        }
      } else {
        setUploadError("Por favor selecciona un archivo de imagen válido.");
      }
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    if (activeTab === "reference_frame" && !avatarUrl.trim()) {
      setUploadError("Un frame de referencia requiere subir una imagen o ingresar un URL.");
      return;
    }

    if (activeTab === "character") {
      onAddCharacter({ name: name.trim(), description: description.trim(), avatarUrl: avatarUrl.trim() || undefined });
    } else if (activeTab === "prop") {
      onAddProp({ name: name.trim(), description: description.trim(), imageUrl: avatarUrl.trim() || undefined });
    } else if (activeTab === "location") {
      onAddLocation({ name: name.trim(), description: description.trim(), imageUrl: avatarUrl.trim() || undefined });
    } else if (activeTab === "reference_frame" && onAddReferenceFrame) {
      onAddReferenceFrame({ name: name.trim(), description: description.trim(), imageUrl: avatarUrl.trim() });
    }

    // Reset
    setName("");
    setDescription("");
    setAvatarUrl("");
    setUploadError(null);
    setShowAddForm(false);
  };

  const filteredCharacters = characters.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProps = props.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLocations = locations.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 shadow-2xl flex flex-col h-full text-text-primary" id="assets-panel">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#71717A]">Materiales y Casting</h2>
            <p className="text-[10px] text-text-secondary">Usa @etiquetas para insertar en prompts</p>
          </div>
        </div>
        <button
          id="btn-add-asset"
          onClick={() => setShowAddForm(!showAddForm)}
          className={`p-2 rounded-xl border transition-all flex items-center space-x-1.5 text-xs font-extrabold cursor-pointer ${
            showAddForm
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
              : "bg-[#d1f025] border-transparent hover:brightness-110 text-black shadow-md shadow-black/10"
          }`}
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showAddForm ? "Cancelar" : "+ Crear Material / Subir Imagen"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#050506] p-1 rounded border border-dark-border mb-4">
        {(["character", "prop", "location", "reference_frame"] as AssetType[]).map((tab) => (
          <button
            key={tab}
            id={`tab-asset-${tab}`}
            onClick={() => {
              setActiveTab(tab);
              setShowAddForm(false);
            }}
            className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              activeTab === tab
                ? "bg-[#27272A] text-[#E4E4E7] border border-[#3F3F46] shadow"
                : "text-[#71717A] hover:text-[#E4E4E7]"
            }`}
          >
            {tab === "character" && <Users className="w-3 h-3 text-orange-400" />}
            {tab === "prop" && <Sparkles className="w-3 h-3 text-amber-400" />}
            {tab === "location" && <MapPin className="w-3 h-3 text-red-400" />}
            {tab === "reference_frame" && <ImageIcon className="w-3 h-3 text-blue-400" />}
            <span className="capitalize">
              {tab === "character" ? "Personajes" : tab === "prop" ? "Objetos" : tab === "location" ? "Escenarios" : "Fotogramas (Ref)"}
            </span>
          </button>
        ))}
      </div>

      {/* Search Input */}
      {!showAddForm && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#71717A]" />
          <input
            id="search-assets"
            type="text"
            placeholder={`Buscar en ${activeTab === "character" ? "Personajes" : activeTab === "prop" ? "Objetos" : activeTab === "location" ? "Escenarios" : "Fotogramas"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-dark-input border border-dark-border rounded text-xs placeholder-[#71717A] text-[#E4E4E7] focus:outline-none focus:border-orange-500/50 transition-all"
          />
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto max-h-[420px] pr-1 space-y-3 custom-scrollbar">
        {showAddForm ? (
          <form onSubmit={handleAdd} className="space-y-4 bg-dark-input/50 border border-dark-border p-4 rounded-xl shadow-inner animate-fade-in" id="add-asset-form">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-400 flex items-center">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Nuevo {activeTab === "character" ? "Personaje" : activeTab === "prop" ? "Objeto" : activeTab === "location" ? "Escenario" : "Fotograma de Referencia"}
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] font-medium text-[#71717A] uppercase tracking-wider block">Nombre del Material</label>
              <input
                id="asset-name-input"
                type="text"
                required
                placeholder={
                  activeTab === "character" 
                    ? "e.g., Cyber Hacker Lucas" 
                    : activeTab === "prop" 
                    ? "e.g., Laser Saber" 
                    : activeTab === "reference_frame"
                    ? "e.g., Vestuario Escena 1"
                    : "e.g., Neon Grid Vault"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#050506] border border-dark-border rounded text-xs text-[#E4E4E7] placeholder-[#3F3F46] focus:outline-none focus:border-orange-500/50"
              />
              <span className="text-[9px] text-[#71717A] italic block mt-0.5">
                Identificador asignado: <span className="font-mono text-orange-400">{name ? getAssetHandle(name) : "@handle"}</span>
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium text-[#71717A] uppercase tracking-wider block">Descripción de Detalle (Prompt)</label>
              <textarea
                id="asset-desc-input"
                required
                rows={3}
                placeholder={
                  activeTab === "character" 
                    ? "Explica el género, cabello, rasgos faciales, vestuario y estilo para que los modelos de IA sepan exactamente qué generar..."
                    : activeTab === "prop" 
                    ? "Explica el tamaño, color, partes brillantes, textura y efectos mágicos o cibernéticos..."
                    : activeTab === "reference_frame"
                    ? "Describe detalles de vestuario del personaje, proporciones faciales o el estilo exacto del escenario..."
                    : "Explica el fondo, clima, iluminación, paleta de colores, detalles arquitectónicos..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#050506] border border-dark-border rounded text-xs text-[#E4E4E7] placeholder-[#3F3F46] focus:outline-none focus:border-orange-500/50 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-medium text-[#71717A] uppercase tracking-wider block">Reference Image</label>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
                id="asset-file-uploader"
              />

              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`border border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-[#d1f025] bg-[#d1f025]/10"
                    : isUploading
                    ? "border-[#d1f025]/50 bg-[#d1f025]/5"
                    : avatarUrl
                    ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10"
                    : "border-dark-border bg-[#050506] hover:border-[#d1f025]/40 hover:bg-[#27272a]/20"
                }`}
                id="image-dropzone"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center space-y-2 py-2">
                    <div className="w-6 h-6 rounded-full border-2 border-[#d1f025]/30 border-t-[#d1f025] animate-spin" />
                    <span className="text-[10px] font-bold text-[#d1f025] animate-pulse">Subiendo imagen de forma segura...</span>
                  </div>
                ) : avatarUrl ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="relative w-16 h-16 rounded border border-emerald-500/30 overflow-hidden bg-black/40">
                      <img
                        src={avatarUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvatarUrl("");
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-rose-400 font-bold text-[10px] transition-opacity"
                      >
                        Eliminar
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                      ¡Imagen cargada correctamente!
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1">
                    <Upload className="w-5 h-5 text-[#71717A] hover:text-[#d1f025] transition-colors" />
                    <span className="text-[11px] text-[#E4E4E7] font-bold">
                      Arrastra y suelta tu imagen aquí o <span className="text-[#d1f025] underline decoration-dotted">explora tus archivos</span>
                    </span>
                    <span className="text-[9px] text-[#71717A]">
                      Soporta JPG, PNG, WebP (compresión optimizada automática)
                    </span>
                  </div>
                )}
              </div>

              {uploadError && (
                <p className="text-[9px] text-rose-400 font-bold" id="upload-error-msg">{uploadError}</p>
              )}

              {/* URL Manual Input Toggle */}
              <div className="pt-1">
                <details className="group">
                  <summary className="text-[9px] text-[#71717A] hover:text-[#d1f025] cursor-pointer select-none list-none flex items-center justify-between font-bold">
                    <span>O pegar enlace (URL) de imagen directo</span>
                    <span className="transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="mt-2">
                    <input
                      id="asset-img-input"
                      type="url"
                      placeholder="https://example.com/reference-picture.jpg"
                      value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#050506] border border-dark-border rounded text-xs text-[#E4E4E7] placeholder-[#3F3F46] focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </details>
              </div>
            </div>

            <button
              id="submit-asset"
              type="submit"
              disabled={isUploading}
              className={`w-full py-2 text-white rounded text-xs font-semibold tracking-wide transition-all shadow-md flex items-center justify-center space-x-1 ${
                isUploading
                  ? "bg-orange-700/50 cursor-not-allowed text-white/50"
                  : "bg-orange-600 hover:bg-orange-500 shadow-orange-950/20"
              }`}
            >
              {isUploading ? (
                <div className="w-3.5 h-3.5 rounded-full border border-white/30 border-t-white animate-spin mr-1.5" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{isUploading ? "Subiendo referencia..." : `Crear ${activeTab === "character" ? "Personaje" : activeTab === "prop" ? "Objeto" : activeTab === "location" ? "Escenario" : "Fotograma"}`}</span>
            </button>
          </form>
        ) : (
          <>
            {activeTab === "character" && filteredCharacters.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">No se encontraron personajes. ¡Crea uno arriba!</div>
            )}
            {activeTab === "prop" && filteredProps.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">No se encontraron objetos. ¡Crea uno arriba!</div>
            )}
            {activeTab === "location" && filteredLocations.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">No se encontraron escenarios. ¡Crea uno arriba!</div>
            )}

            {activeTab === "character" && filteredCharacters.map((char) => (
              <div 
                key={char.id} 
                id={`char-${char.id}`}
                className="group relative flex flex-col p-3 bg-dark-item hover:bg-[#27272A]/40 border border-dark-border hover:border-orange-500/30 rounded-lg transition-all shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded bg-orange-500/10 border border-orange-500/20 overflow-hidden flex items-center justify-center shrink-0">
                      {char.avatarUrl ? (
                        <img 
                          src={char.avatarUrl} 
                          alt={char.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Users className="w-3.5 h-3.5 text-orange-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-semibold text-[#E4E4E7]">{char.name}</h4>
                      <span className="font-mono text-[9px] text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded border border-orange-500/20">
                        {getAssetHandle(char.name)}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`delete-char-${char.id}`}
                    onClick={() => onDeleteCharacter(char.id)}
                    className="p-1 text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                    title="Delete character"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[10px] text-[#A1A1AA] leading-relaxed italic border-l-2 border-[#3F3F46] pl-2 bg-[#050506]/40 py-1 rounded-r">
                  {char.description}
                </p>

                <button
                  id={`use-char-${char.id}`}
                  onClick={() => onInsertAssetHandle(getAssetHandle(char.name))}
                  className="w-full py-1 bg-[#1F1F23] hover:bg-[#27272A] text-[#E4E4E7] border border-[#3F3F46] hover:border-orange-500/30 rounded text-[10px] font-medium transition-all flex items-center justify-center"
                >
                  <Copy className="w-3 h-3 mr-1 text-orange-400" />
                  <span>Usar @{char.name}</span>
                </button>
              </div>
            ))}

            {activeTab === "prop" && filteredProps.map((prop) => (
              <div 
                key={prop.id} 
                id={`prop-${prop.id}`}
                className="group relative flex flex-col p-3 bg-dark-item hover:bg-[#27272A]/40 border border-dark-border hover:border-orange-500/30 rounded-lg transition-all shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 overflow-hidden flex items-center justify-center shrink-0">
                      {prop.imageUrl ? (
                        <img 
                          src={prop.imageUrl} 
                          alt={prop.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-semibold text-[#E4E4E7]">{prop.name}</h4>
                      <span className="font-mono text-[9px] text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">
                        {getAssetHandle(prop.name)}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`delete-prop-${prop.id}`}
                    onClick={() => onDeleteProp(prop.id)}
                    className="p-1 text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                    title="Delete prop"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[10px] text-[#A1A1AA] leading-relaxed italic border-l-2 border-[#3F3F46] pl-2 bg-[#050506]/40 py-1 rounded-r">
                  {prop.description}
                </p>

                <button
                  id={`use-prop-${prop.id}`}
                  onClick={() => onInsertAssetHandle(getAssetHandle(prop.name))}
                  className="w-full py-1 bg-[#1F1F23] hover:bg-[#27272A] text-[#E4E4E7] border border-[#3F3F46] hover:border-orange-500/30 rounded text-[10px] font-medium transition-all flex items-center justify-center"
                >
                  <Copy className="w-3 h-3 mr-1 text-amber-400" />
                  <span>Usar @{prop.name}</span>
                </button>
              </div>
            ))}

            {activeTab === "location" && filteredLocations.map((loc) => (
              <div 
                key={loc.id} 
                id={`loc-${loc.id}`}
                className="group relative flex flex-col p-3 bg-dark-item hover:bg-[#27272A]/40 border border-dark-border hover:border-orange-500/30 rounded-lg transition-all shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded bg-red-500/10 border border-red-500/20 overflow-hidden flex items-center justify-center shrink-0">
                      {loc.imageUrl ? (
                        <img 
                          src={loc.imageUrl} 
                          alt={loc.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-semibold text-[#E4E4E7]">{loc.name}</h4>
                      <span className="font-mono text-[9px] text-red-400 bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20">
                        {getAssetHandle(loc.name)}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`delete-loc-${loc.id}`}
                    onClick={() => onDeleteLocation(loc.id)}
                    className="p-1 text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                    title="Delete location"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[10px] text-[#A1A1AA] leading-relaxed italic border-l-2 border-[#3F3F46] pl-2 bg-[#050506]/40 py-1 rounded-r">
                  {loc.description}
                </p>

                <button
                  id={`use-loc-${loc.id}`}
                  onClick={() => onInsertAssetHandle(getAssetHandle(loc.name))}
                  className="w-full py-1 bg-[#1F1F23] hover:bg-[#27272A] text-[#E4E4E7] border border-[#3F3F46] hover:border-orange-500/30 rounded text-[10px] font-medium transition-all flex items-center justify-center"
                >
                  <Copy className="w-3 h-3 mr-1 text-red-400" />
                  <span>Usar @{loc.name}</span>
                </button>
              </div>
            ))}

            {activeTab === "reference_frame" && (referenceFrames || []).length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">No hay frames de referencia. ¡Crea uno arriba!</div>
            )}

            {activeTab === "reference_frame" && (referenceFrames || []).map((frame) => (
              <div 
                key={frame.id} 
                id={`frame-${frame.id}`}
                className="group relative flex flex-col p-3 bg-dark-item hover:bg-[#27272A]/40 border border-dark-border hover:border-blue-500/30 rounded-lg transition-all shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 overflow-hidden flex items-center justify-center shrink-0">
                      {frame.imageUrl ? (
                        <img 
                          src={frame.imageUrl} 
                          alt={frame.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-semibold text-[#E4E4E7]">{frame.name}</h4>
                      <span className="text-[9px] text-blue-400 font-mono">
                        Frame de Referencia
                      </span>
                    </div>
                  </div>

                  <button
                    id={`delete-frame-${frame.id}`}
                    onClick={() => onDeleteReferenceFrame && onDeleteReferenceFrame(frame.id)}
                    className="p-1 text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                    title="Delete reference frame"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[10px] text-[#A1A1AA] leading-relaxed italic border-l-2 border-[#3F3F46] pl-2 bg-[#050506]/40 py-1 rounded-r">
                  {frame.description}
                </p>

                <div className="text-[9px] text-[#71717A] bg-[#050506] p-1.5 rounded font-mono truncate select-all" title={frame.imageUrl}>
                  URL: {frame.imageUrl}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Asset Info Help Footer */}
      {!showAddForm && (
        <div className="mt-4 pt-3 border-t border-dark-border flex items-start space-x-2 text-[10px] text-text-secondary">
          <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Al insertar <span className="text-orange-400">@Etiquetas</span> en tu prompt, el compositor las reemplazará automáticamente con sus descripciones detalladas antes de renderizar.
          </p>
        </div>
      )}
    </div>
  );
}
