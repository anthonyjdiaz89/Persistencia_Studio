/**
 * Script Panel — Manual storyboard editor with episode loader.
 * Scenes = Blocks from the script. Clips = 10-second segments (API limit).
 *
 * Features:
 * - Episode selector (EP01–EP06 pre-loaded)
 * - Per-scene reference image upload (used in first clip of each block)
 * - Subsequent clips show continuity note (last frame of previous clip)
 * - Render individual clips or full scenes (parallel or sequential)
 * - Export / Import as JSON
 * - Persistent localStorage
 */

import React, { useState, useEffect, useRef } from "react";
import { CharacterAsset, PropAsset, LocationAsset, ReferenceFrameAsset, VideoTask } from "../types";
import { uploadImageToSupabase, uploadFileToSupabase } from "../lib/firebase";
import {
  Plus, Trash2, Play, PlayCircle, ChevronDown, ChevronRight,
  Film, Clapperboard, Loader2, Download, Upload, Copy, Check,
  AtSign, Settings2, SkipForward, Edit3, Image, BookOpen, RefreshCw, X, Video, Link,
} from "lucide-react";
import { ClipBlueprint, SceneBlueprint } from "./AIDirectorPanel";
import { EPISODES } from "../data/episodeScripts";

const CAMERA_STYLES = ["auto","static","drone","handheld","dolly","crane","orbit","fpv","panoramic"];
const CAMERA_PANS = ["none","left","right"];
const CAMERA_TILTS = ["none","up","down"];
const CAMERA_ZOOMS = ["none","in","out"];
const CAMERA_SPEEDS = ["slow","normal","fast"];
const TIMES_OF_DAY = ["dawn","day","afternoon","sunset","night"];

const defaultCamera = (): ClipBlueprint["cameraSettings"] => ({
  pan:"none",tilt:"none",zoom:"none",roll:"none",speed:"normal",
  style:"auto",timeOfDay:"day",motionCurve:"ease-in-out",
});

const defaultClip = (n: number): ClipBlueprint => ({
  clipNumber:n,title:`Shot ${n}`,prompt:"",
  cameraSettings:defaultCamera(),duration:10,generate_audio:true,consistencyExplanation:"",
});

const defaultScene = (n: number): SceneBlueprint => ({
  sceneTitle:`Escena ${n}`,sceneDescription:"",directorCommentary:"",
  clips:[defaultClip(1)],referenceImageUrl:"",
});

const STORAGE_KEY = "seedance_script_scenes";

interface ScriptPanelProps {
  characters: CharacterAsset[];
  props: PropAsset[];
  locations: LocationAsset[];
  referenceFrames?: ReferenceFrameAsset[];
  tasks?: VideoTask[]; // History of generated videos for continuity selection
  onLoadClipConfig: (clip: ClipBlueprint) => void;
  onRenderClip: (clip: ClipBlueprint, parentBlueprint?: SceneBlueprint, customResolution?: "720p"|"1080p") => void;
  onRenderScene: (blueprint: SceneBlueprint, customResolution?: "720p"|"1080p") => void;
  onRenderSceneSequentially?: (blueprint: SceneBlueprint, customResolution?: "720p"|"1080p") => void;
  isSequentiallyRendering?: boolean;
  sequentialRenderProgress?: { current:number; total:number; status:string }|null;
}

export default function ScriptPanel({
  characters, props, locations, tasks = [],
  onLoadClipConfig, onRenderClip, onRenderScene, onRenderSceneSequentially,
  isSequentiallyRendering=false, sequentialRenderProgress=null,
}: ScriptPanelProps) {
  const [scenes, setScenes] = useState<SceneBlueprint[]>(() => {
    try { const s=localStorage.getItem(STORAGE_KEY); if(s) return JSON.parse(s); } catch {}
    return [defaultScene(1)];
  });
  const [expandedScenes, setExpandedScenes] = useState<Record<number,boolean>>({0:true});
  const [expandedClips, setExpandedClips] = useState<Record<string,boolean>>({});
  const [expandedCamera, setExpandedCamera] = useState<Record<string,boolean>>({});
  const [renderRes, setRenderRes] = useState<"720p"|"1080p">("1080p");
  const [copiedId, setCopiedId] = useState<string|null>(null);
  const [showEpMenu, setShowEpMenu] = useState(false);
  const [loadedEp, setLoadedEp] = useState<string|null>(null);
  const [uploadingRef, setUploadingRef] = useState<number|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const refImgRef = useRef<HTMLInputElement>(null);
  const pendingRefSi = useRef<number|null>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes)); }, [scenes]);

  /* ── Episode loader ─────────────────────────────── */
  const loadEp = (epId: string) => {
    const ep = EPISODES.find(e=>e.id===epId);
    if(!ep) return;
    const hasContent = scenes.some(s=>s.clips.some(c=>c.prompt.trim()));
    if(hasContent && !window.confirm(`¿Cargar ${ep.title} – ${ep.subtitle}?\nEsto reemplazará el guión actual.`)) return;
    setScenes(JSON.parse(JSON.stringify(ep.scenes)));
    setExpandedScenes({0:true}); setExpandedClips({}); setLoadedEp(epId); setShowEpMenu(false);
  };

  /* ── Reference image per scene ──────────────────── */
  const openRefUpload = (si: number) => { pendingRefSi.current=si; refImgRef.current?.click(); };
  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const si=pendingRefSi.current; const file=e.target.files?.[0];
    if(si===null||!file) return;
    setUploadingRef(si);
    try {
      const url = await uploadImageToSupabase(file,"video-assets","script-references");
      setScenes(prev=>prev.map((s,i)=>i===si?{...s,referenceImageUrl:url}:s));
    } catch(err){console.error(err);}
    finally{ setUploadingRef(null); e.target.value=""; }
  };
  const clearRef = (si: number) => setScenes(prev=>prev.map((s,i)=>i===si?{...s,referenceImageUrl:""}:s));

  /* ── Scene helpers ──────────────────────────────── */
  const addScene = () => setScenes(prev=>{ const idx=prev.length; setExpandedScenes(s=>({...s,[idx]:true})); return [...prev,defaultScene(prev.length+1)]; });
  const delScene = (si: number) => setScenes(prev=>prev.filter((_,i)=>i!==si));
  const setSceneTitle = (si:number,t:string) => setScenes(prev=>prev.map((s,i)=>i===si?{...s,sceneTitle:t}:s));

  /* ── Clip helpers ───────────────────────────────── */
  const addClip=(si:number)=>setScenes(prev=>prev.map((s,i)=>{if(i!==si)return s;const n=s.clips.length+1;setExpandedClips(c=>({...c,[`${si}-${n-1}`]:true}));return{...s,clips:[...s.clips,defaultClip(n)]};}));
  const delClip=(si:number,ci:number)=>setScenes(prev=>prev.map((s,i)=>{if(i!==si)return s;const clips=s.clips.filter((_,j)=>j!==ci).map((c,j)=>({...c,clipNumber:j+1}));return{...s,clips};}));
  const setClipField=(si:number,ci:number,f:keyof ClipBlueprint,v:any)=>setScenes(prev=>prev.map((s,i)=>i!==si?s:{...s,clips:s.clips.map((c,j)=>j!==ci?c:{...c,[f]:v})}));
  const setClipCam=(si:number,ci:number,k:keyof ClipBlueprint["cameraSettings"],v:string)=>setScenes(prev=>prev.map((s,i)=>i!==si?s:{...s,clips:s.clips.map((c,j)=>j!==ci?c:{...c,cameraSettings:{...c.cameraSettings,[k]:v}})}));
  const insertMention=(si:number,ci:number,h:string)=>setScenes(prev=>prev.map((s,i)=>i!==si?s:{...s,clips:s.clips.map((c,j)=>{if(j!==ci)return c;const sep=c.prompt&&!c.prompt.endsWith(" ")?" ":"";return{...c,prompt:c.prompt+sep+h+" "};})}));
  const dupClip=(si:number,ci:number)=>setScenes(prev=>prev.map((s,i)=>{if(i!==si)return s;const o=s.clips[ci];return{...s,clips:[...s.clips,{...JSON.parse(JSON.stringify(o)),clipNumber:s.clips.length+1,title:o.title+" (copia)"}]};}));

  /* ── Render with ref image injection ───────────── */
  const renderClip=(clip:ClipBlueprint,scene:SceneBlueprint,ci:number)=>{
    // Per-clip reference image (takes priority) OR scene reference (applied to ALL clips)
    const perClipRef = clip.clip_ref_image || null;
    const sceneRef   = scene.referenceImageUrl || null;
    const refImage   = perClipRef || sceneRef; // use per-clip if set, else scene ref

    const withRef = refImage
      ? {...clip, image_urls:[refImage,...(clip.image_urls||[]).filter(u=>u!==refImage)].slice(0,5)}
      : clip;
    // Include video_url for continuity if set on the clip
    const withVideo = withRef.video_url
      ? {...withRef, video_urls:[withRef.video_url]}
      : withRef;
    onRenderClip(withVideo, scene, renderRes);
  };

  /* ── Copy / Export / Import ─────────────────────── */
  const copyPrompt=(t:string,k:string)=>{ navigator.clipboard.writeText(t).then(()=>{ setCopiedId(k); setTimeout(()=>setCopiedId(null),1500); }); };
  const exportScript=()=>{ const b=new Blob([JSON.stringify(scenes,null,2)],{type:"application/json"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=`guion${loadedEp?"_"+loadedEp:""}.json`; a.click(); URL.revokeObjectURL(u); };
  const importScript=(e:React.ChangeEvent<HTMLInputElement>)=>{ const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{ try{ const p=JSON.parse(ev.target?.result as string); if(Array.isArray(p)){setScenes(p);setExpandedScenes({0:true});} }catch{} }; r.readAsText(f); e.target.value=""; };

  /* ── Stats ──────────────────────────────────────── */
  const total=scenes.reduce((a,s)=>a+s.clips.length,0);
  const min=Math.floor(total*10/60), sec=(total*10)%60;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#121317]">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/5 bg-[#0e0f12] flex-shrink-0 space-y-2">
        {/* Episode selector */}
        <div className="relative">
          <button
            onClick={()=>setShowEpMenu(v=>!v)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-[#d1f025]/10 border border-[#d1f025]/25 rounded-lg hover:bg-[#d1f025]/20 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#d1f025] flex-shrink-0" />
            <span className="flex-1 text-left text-[10px] font-bold text-[#d1f025] truncate">
              {loadedEp ? `${EPISODES.find(e=>e.id===loadedEp)?.title} · ${EPISODES.find(e=>e.id===loadedEp)?.subtitle}` : "Cargar episodio…"}
            </span>
            <ChevronDown className={`w-3 h-3 text-[#d1f025]/70 transition-transform ${showEpMenu?"rotate-180":""}`} />
          </button>
          {showEpMenu&&(
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#1a1c24] border border-white/15 rounded-lg overflow-hidden shadow-xl">
              {EPISODES.map(ep=>(
                <button key={ep.id} onClick={()=>loadEp(ep.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 ${loadedEp===ep.id?"bg-[#d1f025]/10":""}`}
                >
                  <Film className={`w-3 h-3 flex-shrink-0 ${loadedEp===ep.id?"text-[#d1f025]":"text-gray-500"}`} />
                  <div>
                    <div className={`text-[10px] font-bold ${loadedEp===ep.id?"text-[#d1f025]":"text-white"}`}>{ep.title}</div>
                    <div className="text-[9px] text-gray-500">{ep.subtitle}</div>
                  </div>
                </button>
              ))}
              <div className="border-t border-white/10 px-3 py-2">
                <button onClick={()=>{setScenes([defaultScene(1)]);setLoadedEp(null);setShowEpMenu(false);}} className="text-[10px] text-gray-500 hover:text-white">
                  + Guión en blanco
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className="font-mono text-[#d1f025]">{scenes.length}</span><span>bloques</span>
            <span className="text-white/20">·</span>
            <span className="font-mono">{total}</span><span>clips</span>
            <span className="text-white/20">·</span>
            <span className="font-mono">{min}m{sec}s</span>
          </div>
          <div className="flex items-center gap-1">
            <select value={renderRes} onChange={e=>setRenderRes(e.target.value as any)}
              className="text-[9px] bg-white/5 border border-white/10 rounded px-1 py-0.5 text-gray-300 focus:outline-none">
              <option value="720p">720p</option><option value="1080p">1080p</option>
            </select>
            <button onClick={exportScript} title="Exportar" className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"><Download className="w-3 h-3"/></button>
            <button onClick={()=>fileRef.current?.click()} title="Importar" className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"><Upload className="w-3 h-3"/></button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importScript}/>
            <input ref={refImgRef} type="file" accept="image/*" className="hidden" onChange={handleRefUpload}/>
          </div>
        </div>

        {/* Sequential progress */}
        {isSequentiallyRendering&&sequentialRenderProgress&&(
          <div className="p-2 bg-[#d1f025]/10 border border-[#d1f025]/20 rounded text-[10px]">
            <div className="flex items-center gap-1.5 mb-1">
              <Loader2 className="w-3 h-3 text-[#d1f025] animate-spin"/>
              <span className="text-[#d1f025] font-medium">Renderizando {sequentialRenderProgress.current}/{sequentialRenderProgress.total}</span>
            </div>
            <p className="text-gray-400 leading-tight">{sequentialRenderProgress.status}</p>
            <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#d1f025] rounded-full transition-all" style={{width:`${(sequentialRenderProgress.current/sequentialRenderProgress.total)*100}%`}}/>
            </div>
          </div>
        )}
      </div>

      {/* Scenes */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-2">
        {scenes.map((scene,si)=>(
          <SceneCard key={si}
            scene={scene} sceneIndex={si}
            isExpanded={!!expandedScenes[si]}
            expandedClips={expandedClips} expandedCamera={expandedCamera}
            characters={characters} props={props} locations={locations}
            tasks={tasks}
            renderRes={renderRes} copiedId={copiedId}
            isSequentiallyRendering={isSequentiallyRendering}
            isUploadingRef={uploadingRef===si}
            onToggleScene={()=>setExpandedScenes(s=>({...s,[si]:!s[si]}))}
            onToggleClip={k=>setExpandedClips(c=>({...c,[k]:!c[k]}))}
            onToggleCamera={k=>setExpandedCamera(c=>({...c,[k]:!c[k]}))}
            onUpdateTitle={t=>setSceneTitle(si,t)}
            onDeleteScene={()=>delScene(si)}
            onAddClip={()=>addClip(si)}
            onDeleteClip={ci=>delClip(si,ci)}
            onDuplicateClip={ci=>dupClip(si,ci)}
            onUpdateClipField={(ci,f,v)=>setClipField(si,ci,f,v)}
            onUpdateClipCamera={(ci,k,v)=>setClipCam(si,ci,k,v)}
            onInsertMention={(ci,h)=>insertMention(si,ci,h)}
            onCopyPrompt={(t,k)=>copyPrompt(t,k)}
            onLoadClip={c=>onLoadClipConfig(c)}
            onRenderClip={(c,ci)=>renderClip(c,scene,ci)}
            onRenderSceneAll={()=>onRenderScene(scene,renderRes)}
            onRenderSceneSequentially={()=>onRenderSceneSequentially?.(scene,renderRes)}
            hasSequentialRender={!!onRenderSceneSequentially}
            onUploadRefImage={()=>openRefUpload(si)}
            onClearRefImage={()=>clearRef(si)}
          />
        ))}
        <button onClick={addScene}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-white/15 rounded-lg text-xs text-gray-500 hover:text-[#d1f025] hover:border-[#d1f025]/40 hover:bg-[#d1f025]/5 transition-all">
          <Plus className="w-3.5 h-3.5"/>Nuevo Bloque
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ Scene Card ══ */
interface SceneCardProps {
  scene: SceneBlueprint; sceneIndex: number; isExpanded: boolean;
  expandedClips: Record<string,boolean>; expandedCamera: Record<string,boolean>;
  characters: CharacterAsset[]; props: PropAsset[]; locations: LocationAsset[];
  tasks: VideoTask[];
  renderRes: string; copiedId: string|null; isSequentiallyRendering: boolean; isUploadingRef: boolean;
  onToggleScene():void; onToggleClip(k:string):void; onToggleCamera(k:string):void;
  onUpdateTitle(t:string):void; onDeleteScene():void; onAddClip():void;
  onDeleteClip(ci:number):void; onDuplicateClip(ci:number):void;
  onUpdateClipField(ci:number,f:keyof ClipBlueprint,v:any):void;
  onUpdateClipCamera(ci:number,k:keyof ClipBlueprint["cameraSettings"],v:string):void;
  onInsertMention(ci:number,h:string):void; onCopyPrompt(t:string,k:string):void;
  onLoadClip(c:ClipBlueprint):void; onRenderClip(c:ClipBlueprint,ci:number):void;
  onRenderSceneAll():void; onRenderSceneSequentially():void; hasSequentialRender: boolean;
  onUploadRefImage():void; onClearRefImage():void;
}

function SceneCard({
  scene,sceneIndex,isExpanded,expandedClips,expandedCamera,
  characters,props,locations,tasks,renderRes,copiedId,isSequentiallyRendering,isUploadingRef,
  onToggleScene,onToggleClip,onToggleCamera,onUpdateTitle,onDeleteScene,onAddClip,
  onDeleteClip,onDuplicateClip,onUpdateClipField,onUpdateClipCamera,
  onInsertMention,onCopyPrompt,onLoadClip,onRenderClip,
  onRenderSceneAll,onRenderSceneSequentially,hasSequentialRender,
  onUploadRefImage,onClearRefImage,
}: SceneCardProps) {
  const [editTitle,setEditTitle]=useState(false);
  const [draft,setDraft]=useState(scene.sceneTitle);
  const commit=()=>{ setEditTitle(false); if(draft.trim()) onUpdateTitle(draft.trim()); else setDraft(scene.sceneTitle); };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0e0f12]">
      <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[#1a1c24]">
        <button onClick={onToggleScene} className="text-gray-500 hover:text-white">
          {isExpanded?<ChevronDown className="w-3.5 h-3.5"/>:<ChevronRight className="w-3.5 h-3.5"/>}
        </button>
        <Clapperboard className="w-3.5 h-3.5 text-[#d1f025] flex-shrink-0"/>
        {editTitle
          ? <input value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
              onKeyDown={e=>{ if(e.key==="Enter")commit(); if(e.key==="Escape"){setEditTitle(false);setDraft(scene.sceneTitle);} }}
              autoFocus className="flex-1 min-w-0 bg-white/10 text-white text-xs px-1.5 py-0.5 rounded outline-none border border-[#d1f025]/40"/>
          : <button onClick={()=>{setEditTitle(true);setDraft(scene.sceneTitle);}}
              className="flex-1 min-w-0 text-left text-xs font-semibold text-white truncate hover:text-[#d1f025]">
              {scene.sceneTitle}
            </button>
        }
        <span className="text-[9px] text-gray-600 flex-shrink-0">{scene.clips.length}×10s</span>
        <button onClick={onDeleteScene} className="ml-1 p-0.5 text-gray-600 hover:text-red-400 flex-shrink-0"><Trash2 className="w-3 h-3"/></button>
      </div>

      {isExpanded&&(
        <div className="px-2 pb-2 pt-1.5 space-y-1.5">
          {/* Reference image row */}
          <div className="flex items-center gap-2 px-2 py-1.5 bg-[#1a1c24]/60 border border-white/8 rounded-lg">
            <Image className="w-3 h-3 text-purple-400 flex-shrink-0"/>
            <span className="text-[9px] text-gray-500 flex-shrink-0">Ref. bloque</span>
            {scene.referenceImageUrl
              ? <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <img src={scene.referenceImageUrl} alt="ref" className="w-8 h-5 rounded object-cover flex-shrink-0 border border-white/20"/>
                  <span className="text-[9px] text-green-400 flex-1 truncate">✓ cargada</span>
                  <button onClick={onClearRefImage} className="text-gray-600 hover:text-red-400 flex-shrink-0"><X className="w-3 h-3"/></button>
                </div>
              : <button onClick={onUploadRefImage} disabled={isUploadingRef}
                  className="flex-1 flex items-center justify-center gap-1 text-[9px] text-purple-400/70 hover:text-purple-300 border border-dashed border-purple-400/20 hover:border-purple-400/40 rounded px-2 py-0.5 transition-all">
                  {isUploadingRef?<Loader2 className="w-3 h-3 animate-spin"/>:<Upload className="w-3 h-3"/>}
                  {isUploadingRef?"Subiendo…":"Subir imagen / fotograma de referencia"}
                </button>
            }
          </div>

          {/* Clips */}
          {scene.clips.map((clip,ci)=>{
            const ck=`${sceneIndex}-${ci}`, camk=`cam-${sceneIndex}-${ci}`;
            return <ClipCard key={ci}
              clip={clip} clipKey={ck} camKey={camk} clipIndex={ci}
              isFirstClip={ci===0} hasSceneRef={!!scene.referenceImageUrl}
              isExpanded={!!expandedClips[ck]} isCameraExpanded={!!expandedCamera[camk]}
              characters={characters} props={props} locations={locations} copiedId={copiedId}
              tasks={tasks}
              onToggle={()=>onToggleClip(ck)} onToggleCamera={()=>onToggleCamera(camk)}
              onDelete={()=>onDeleteClip(ci)} onDuplicate={()=>onDuplicateClip(ci)}
              onUpdateField={(f,v)=>onUpdateClipField(ci,f,v)}
              onUpdateCamera={(k,v)=>onUpdateClipCamera(ci,k,v)}
              onInsertMention={h=>onInsertMention(ci,h)}
              onCopy={t=>onCopyPrompt(t,ck)}
              onLoad={()=>onLoadClip(clip)}
              onRender={()=>onRenderClip(clip,ci)}
            />;
          })}

          <button onClick={onAddClip}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-gray-600 hover:text-[#d1f025] border border-dashed border-white/10 hover:border-[#d1f025]/30 rounded transition-all">
            <Plus className="w-3 h-3"/>Agregar clip (10s)
          </button>

          {scene.clips.length>0&&(
            <div className="flex gap-1.5">
              <button onClick={onRenderSceneAll} disabled={isSequentiallyRendering}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium bg-[#d1f025]/15 text-[#d1f025] rounded hover:bg-[#d1f025]/25 disabled:opacity-40">
                <Play className="w-3 h-3"/>Todo ({renderRes})
              </button>
              {hasSequentialRender&&(
                <button onClick={onRenderSceneSequentially} disabled={isSequentiallyRendering}
                  title="Secuencial: cada clip usa el último fotograma del anterior"
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium bg-white/5 text-gray-300 rounded hover:bg-white/10 disabled:opacity-40">
                  {isSequentiallyRendering?<Loader2 className="w-3 h-3 animate-spin"/>:<SkipForward className="w-3 h-3"/>}
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

/* ═══════════════════════════════════════════ Clip Card ═══ */
interface ClipCardProps {
  clip: ClipBlueprint; clipKey: string; camKey: string; clipIndex: number;
  isFirstClip: boolean; hasSceneRef: boolean;
  isExpanded: boolean; isCameraExpanded: boolean;
  characters: CharacterAsset[]; props: PropAsset[]; locations: LocationAsset[];
  tasks: VideoTask[];
  copiedId: string|null;
  onToggle():void; onToggleCamera():void; onDelete():void; onDuplicate():void;
  onUpdateField(f:keyof ClipBlueprint,v:any):void;
  onUpdateCamera(k:keyof ClipBlueprint["cameraSettings"],v:string):void;
  onInsertMention(h:string):void; onCopy(t:string):void; onLoad():void; onRender():void;
}

function ClipCard({
  clip,clipKey,clipIndex,isFirstClip,hasSceneRef,
  isExpanded,isCameraExpanded,characters,props,locations,tasks,copiedId,
  onToggle,onToggleCamera,onDelete,onDuplicate,
  onUpdateField,onUpdateCamera,onInsertMention,onCopy,onLoad,onRender,
}: ClipCardProps) {
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const videoFileRef = useRef<HTMLInputElement>(null);
  // Per-clip reference image (fotograma de referencia)
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const completedVideos = tasks.filter(t => t.status === 'completed' && t.data?.results?.[0]);
  // Completed tasks that have a last_frame_url (most useful as reference frames)
  const framesFromHistory = tasks.filter(t => t.status === 'completed' && t.data?.last_frame_url);
  const assets=[
    ...characters.map(c=>({label:`@${c.name}`,handle:`@${c.name}`,type:"char"})),
    ...props.map(p=>({label:`@${p.name}`,handle:`@${p.name}`,type:"prop"})),
    ...locations.map(l=>({label:`@${l.name}`,handle:`@${l.name}`,type:"loc"})),
  ];
  const empty=!clip.prompt.trim();

  return (
    <div className={`border rounded-md overflow-hidden ${isExpanded?"border-white/15 bg-[#15171e]":"border-white/8 bg-[#0e0f12]"}`}>
      <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none group" onClick={onToggle}>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="w-5 h-5 rounded bg-[#d1f025]/10 text-[#d1f025] text-[9px] font-black flex items-center justify-center">{clip.clipNumber}</span>
          {isFirstClip&&hasSceneRef&&<span title="Usará imagen de referencia del bloque"><Image className="w-3 h-3 text-purple-400"/></span>}
          {clip.clip_ref_image&&<span title="Fotograma de referencia propio"><Image className="w-3 h-3 text-purple-300"/></span>}
          {clip.video_url&&<span title="Video de referencia"><Video className="w-3 h-3 text-cyan-400"/></span>}
        </div>
        {isExpanded?<ChevronDown className="w-3 h-3 text-gray-500"/>:<ChevronRight className="w-3 h-3 text-gray-500"/>}
        <span className="flex-1 text-[10px] text-gray-300 group-hover:text-white truncate min-w-0">{clip.title}</span>
        {empty&&<span className="text-[9px] text-orange-400/70 flex-shrink-0">sin prompt</span>}
        <span className="text-[9px] text-gray-600 flex-shrink-0">10s</span>
        <button onClick={e=>{e.stopPropagation();onRender();}} disabled={empty}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-[#d1f025] hover:bg-[#d1f025]/10 rounded disabled:opacity-20">
          <PlayCircle className="w-3.5 h-3.5"/>
        </button>
      </div>

      {isExpanded&&(
        <div className="px-2.5 pb-2.5 space-y-2" onClick={e=>e.stopPropagation()}>
          {isFirstClip&&hasSceneRef&&(
            <div className="flex items-center gap-1.5 text-[9px] text-purple-400/80 bg-purple-400/5 border border-purple-400/15 rounded px-2 py-1">
              <Image className="w-3 h-3 flex-shrink-0"/>Usará imagen de referencia del bloque
            </div>
          )}
          {clipIndex>0&&(
            <div className="flex items-center gap-1.5 text-[9px] text-blue-400/70 bg-blue-400/5 border border-blue-400/10 rounded px-2 py-1">
              <RefreshCw className="w-3 h-3 flex-shrink-0"/>Continuidad: último fotograma del clip anterior
            </div>
          )}

          <input value={clip.title} onChange={e=>onUpdateField("title",e.target.value)}
            placeholder="Título…" className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white placeholder-gray-600 focus:outline-none focus:border-[#d1f025]/40"/>

          {assets.length>0&&(
            <div>
              <p className="text-[9px] text-gray-600 mb-1 flex items-center gap-1"><AtSign className="w-3 h-3"/>Insertar</p>
              <div className="flex flex-wrap gap-1">
                {assets.map(a=>(
                  <button key={a.handle} onClick={()=>onInsertMention(a.handle)}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${a.type==="char"?"bg-purple-500/15 text-purple-300 hover:bg-purple-500/30":a.type==="prop"?"bg-blue-500/15 text-blue-300 hover:bg-blue-500/30":"bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30"}`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <textarea value={clip.prompt} onChange={e=>onUpdateField("prompt",e.target.value)}
              placeholder="Describe la acción... usa @Personaje, @Locacion"
              rows={3} className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#d1f025]/30 resize-none leading-relaxed"/>
            {clip.prompt&&(
              <button onClick={()=>onCopy(clip.prompt)} className="absolute top-1.5 right-1.5 p-0.5 text-gray-600 hover:text-gray-400">
                {copiedId===clipKey?<Check className="w-3 h-3 text-green-400"/>:<Copy className="w-3 h-3"/>}
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={()=>onUpdateField("generate_audio",!clip.generate_audio)}
              className={`relative w-7 h-4 rounded-full ${clip.generate_audio?"bg-[#d1f025]":"bg-white/10"}`}>
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${clip.generate_audio?"translate-x-3":"translate-x-0"}`}/>
            </div>
            <span className="text-[10px] text-gray-400">Audio</span>
          </label>

          {/* Continuidad: video de referencia propio o del historial */}
          <div className="border border-white/8 rounded-lg overflow-hidden">
            <button
              onClick={()=>setShowVideoSelector(v=>!v)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] hover:bg-white/5 transition-colors"
            >
              <Video className={`w-3 h-3 flex-shrink-0 ${clip.video_url?"text-cyan-400":"text-gray-600"}`}/>
              <span className={`flex-1 text-left truncate ${clip.video_url?"text-cyan-400":"text-gray-500"}`}>
                {clip.video_url ? "Video de referencia seleccionado ✓" : "Video de referencia (drone, plano prev.)"}
              </span>
              {clip.video_url && (
                <button onClick={e=>{e.stopPropagation();onUpdateField("video_url","");setVideoUrlInput("");}} className="text-gray-600 hover:text-red-400 flex-shrink-0">
                  <X className="w-3 h-3"/>
                </button>
              )}
              {showVideoSelector?<ChevronDown className="w-3 h-3 text-gray-600"/>:<ChevronRight className="w-3 h-3 text-gray-600"/>}
            </button>

            {showVideoSelector && (
              <div className="border-t border-white/8 bg-[#0e0f12]">
                {/* Option 1: Paste URL */}
                <div className="px-2 pt-2 pb-1" onClick={e=>e.stopPropagation()}>
                  <p className="text-[9px] text-gray-500 mb-1">Pegar URL de video:</p>
                  <div className="flex gap-1">
                    <input
                      value={videoUrlInput}
                      onChange={e=>setVideoUrlInput(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&videoUrlInput.trim()){onUpdateField("video_url",videoUrlInput.trim());setShowVideoSelector(false);setVideoUrlInput("");}e.stopPropagation();}}
                      onClick={e=>e.stopPropagation()}
                      placeholder="https://... o URL de Supabase"
                      className="flex-1 text-[9px] bg-white/5 border border-white/10 rounded px-1.5 py-1 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400/40"
                    />
                    <button
                      onClick={e=>{
                        e.stopPropagation();
                        if(videoUrlInput.trim()){
                          onUpdateField("video_url", videoUrlInput.trim());
                          setShowVideoSelector(false);
                          setVideoUrlInput("");
                        }
                      }}
                      disabled={!videoUrlInput.trim()}
                      className="text-[9px] px-2 py-1 bg-cyan-400/10 text-cyan-400 rounded hover:bg-cyan-400/20 disabled:opacity-30 transition-colors"
                    >
                      Usar
                    </button>
                  </div>
                </div>

                {/* Option 2: Upload video file */}
                <div className="px-2 pb-2">
                  <input
                    ref={videoFileRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (e)=>{
                      const file = e.target.files?.[0];
                      if(!file) return;
                      setIsUploadingVideo(true);
                      try {
                        const url = await uploadFileToSupabase(file, "video-assets", "reference-videos");
                        onUpdateField("video_url", url);
                        setShowVideoSelector(false);
                      } catch(err){
                        console.error("Video upload error:", err);
                        alert("Error al subir video: " + (err instanceof Error ? err.message : String(err)));
                      }
                      finally{ setIsUploadingVideo(false); e.target.value=""; }
                    }}
                  />
                  <button
                    onClick={()=>videoFileRef.current?.click()}
                    disabled={isUploadingVideo}
                    className="w-full flex items-center justify-center gap-1.5 text-[9px] py-1 border border-dashed border-cyan-400/20 text-cyan-400/60 hover:text-cyan-400 hover:border-cyan-400/40 rounded transition-all"
                  >
                    {isUploadingVideo ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3"/>}
                    {isUploadingVideo ? "Subiendo video..." : "Subir video de referencia (drone, plano propio)"}
                  </button>
                </div>

                {/* Option 3: From history */}
                {completedVideos.length > 0 && (
                  <div className="border-t border-white/8 max-h-32 overflow-y-auto">
                    <p className="text-[9px] text-gray-600 px-2 pt-1.5 pb-0.5">Del historial generado:</p>
                    {completedVideos.slice(0,10).map(task=>{
                      const videoUrl = task.data?.results?.[0];
                      const isSelected = clip.video_url === videoUrl;
                      return (
                        <button
                          key={task.id}
                          onClick={()=>{ onUpdateField("video_url", isSelected ? "" : videoUrl); setShowVideoSelector(false); }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-white/5 transition-colors ${isSelected?"bg-cyan-400/10":""}`}
                        >
                          <Video className={`w-3 h-3 flex-shrink-0 ${isSelected?"text-cyan-400":"text-gray-600"}`}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-gray-300 truncate">
                              {task.sceneTitle ? `${task.sceneTitle} · Shot ${task.clipNumber}` : task.id.slice(0,12)+'...'}
                            </p>
                          </div>
                          {isSelected && <Check className="w-3 h-3 text-cyan-400 flex-shrink-0"/>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fotograma de referencia por clip */}
          <div className="border border-white/8 rounded-lg overflow-hidden">
            <button
              onClick={()=>setShowImageSelector(v=>!v)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] hover:bg-white/5 transition-colors"
            >
              <Image className={`w-3 h-3 flex-shrink-0 ${clip.clip_ref_image?"text-purple-400":"text-gray-600"}`}/>
              <span className={`flex-1 text-left truncate ${clip.clip_ref_image?"text-purple-400":"text-gray-500"}`}>
                {clip.clip_ref_image ? "Fotograma de referencia ✓" : "Fotograma de referencia (por clip)"}
              </span>
              {clip.clip_ref_image && (
                <button onClick={e=>{e.stopPropagation();onUpdateField("clip_ref_image","");}} className="text-gray-600 hover:text-red-400 flex-shrink-0">
                  <X className="w-3 h-3"/>
                </button>
              )}
              {showImageSelector?<ChevronDown className="w-3 h-3 text-gray-600"/>:<ChevronRight className="w-3 h-3 text-gray-600"/>}
            </button>

            {showImageSelector && (
              <div className="border-t border-white/8 bg-[#0e0f12]">
                {/* Paste URL */}
                <div className="px-2 pt-2 pb-1" onClick={e=>e.stopPropagation()}>
                  <p className="text-[9px] text-gray-500 mb-1">Pegar URL de imagen/fotograma:</p>
                  <div className="flex gap-1">
                    <input
                      value={imageUrlInput}
                      onChange={e=>setImageUrlInput(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&imageUrlInput.trim()){onUpdateField("clip_ref_image",imageUrlInput.trim());setShowImageSelector(false);setImageUrlInput("");}e.stopPropagation();}}
                      onClick={e=>e.stopPropagation()}
                      placeholder="https://... (jpg, png, webp)"
                      className="flex-1 text-[9px] bg-white/5 border border-white/10 rounded px-1.5 py-1 text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/40"
                    />
                    <button
                      onClick={e=>{e.stopPropagation();if(imageUrlInput.trim()){onUpdateField("clip_ref_image",imageUrlInput.trim());setShowImageSelector(false);setImageUrlInput("");}}}
                      disabled={!imageUrlInput.trim()}
                      className="text-[9px] px-2 py-1 bg-purple-400/10 text-purple-400 rounded hover:bg-purple-400/20 disabled:opacity-30 transition-colors"
                    >Usar</button>
                  </div>
                </div>

                {/* Upload image */}
                <div className="px-2 pb-2">
                  <input ref={imageFileRef} type="file" accept="image/*" className="hidden"
                    onChange={async (e)=>{
                      const file = e.target.files?.[0]; if(!file) return;
                      setIsUploadingImage(true);
                      try {
                        const url = await uploadImageToSupabase(file, "video-assets", "reference-frames");
                        onUpdateField("clip_ref_image", url);
                        setShowImageSelector(false);
                      } catch(err){ alert("Error al subir imagen: "+(err instanceof Error?err.message:String(err))); }
                      finally{ setIsUploadingImage(false); e.target.value=""; }
                    }}
                  />
                  <button onClick={()=>imageFileRef.current?.click()} disabled={isUploadingImage}
                    className="w-full flex items-center justify-center gap-1.5 text-[9px] py-1 border border-dashed border-purple-400/20 text-purple-400/60 hover:text-purple-400 hover:border-purple-400/40 rounded transition-all">
                    {isUploadingImage ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3"/>}
                    {isUploadingImage ? "Subiendo..." : "Subir imagen de referencia"}
                  </button>
                </div>

                {/* Last frames from history (most useful: pick last frame of prev clip) */}
                {framesFromHistory.length > 0 && (
                  <div className="border-t border-white/8 max-h-36 overflow-y-auto">
                    <p className="text-[9px] text-gray-500 px-2 pt-1.5 pb-0.5 font-medium">Último fotograma del clip generado:</p>
                    {framesFromHistory.slice(0,12).map(task=>{
                      const frameUrl = task.data!.last_frame_url!;
                      const isSelected = clip.clip_ref_image === frameUrl;
                      return (
                        <button key={task.id}
                          onClick={()=>{ onUpdateField("clip_ref_image", isSelected?"":frameUrl); setShowImageSelector(false); }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-white/5 transition-colors ${isSelected?"bg-purple-400/10":""}`}
                        >
                          <img src={frameUrl} alt="" className="w-8 h-5 object-cover rounded flex-shrink-0 border border-white/10"/>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-gray-300 truncate">
                              {task.sceneTitle ? `${task.sceneTitle} · Shot ${task.clipNumber}` : task.id.slice(0,12)+'...'}
                            </p>
                            <p className="text-[8px] text-gray-600">último fotograma</p>
                          </div>
                          {isSelected && <Check className="w-3 h-3 text-purple-400 flex-shrink-0"/>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <button onClick={onToggleCamera} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300">
              <Settings2 className="w-3 h-3"/>Cámara
              {isCameraExpanded?<ChevronDown className="w-3 h-3"/>:<ChevronRight className="w-3 h-3"/>}
              <span className="text-[9px] text-gray-700 ml-0.5">{clip.cameraSettings.style}·{clip.cameraSettings.timeOfDay}</span>
            </button>
            {isCameraExpanded&&(
              <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
                {[{l:"Estilo",k:"style",o:CAMERA_STYLES},{l:"Hora",k:"timeOfDay",o:TIMES_OF_DAY},{l:"Pan",k:"pan",o:CAMERA_PANS},{l:"Tilt",k:"tilt",o:CAMERA_TILTS},{l:"Zoom",k:"zoom",o:CAMERA_ZOOMS},{l:"Speed",k:"speed",o:CAMERA_SPEEDS}].map(({l,k,o})=>(
                  <div key={k}>
                    <p className="text-[9px] text-gray-600 mb-0.5">{l}</p>
                    <select value={(clip.cameraSettings as any)[k]} onChange={e=>onUpdateCamera(k as any,e.target.value)}
                      className="w-full text-[9px] bg-white/5 border border-white/10 rounded px-1 py-0.5 text-gray-300 focus:outline-none">
                      {o.map(v=><option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <button onClick={onRender} disabled={empty}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold bg-[#d1f025] text-black rounded hover:bg-[#bfdc1e] disabled:opacity-30 disabled:cursor-not-allowed">
              <Play className="w-3 h-3"/>Render
            </button>
            <button onClick={onLoad} disabled={empty} title="Cargar en Composer" className="py-1.5 px-2 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30"><Edit3 className="w-3 h-3"/></button>
            <button onClick={onDuplicate} title="Duplicar" className="py-1.5 px-2 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded"><Copy className="w-3 h-3"/></button>
            <button onClick={onDelete} title="Eliminar" className="py-1.5 px-2 bg-white/5 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded"><Trash2 className="w-3 h-3"/></button>
          </div>
        </div>
      )}
    </div>
  );
}
