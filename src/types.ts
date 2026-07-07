/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AssetType = "character" | "prop" | "location" | "reference_frame";

export interface ReferenceFrameAsset {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface CharacterAsset {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string; // Seedance allows image-to-video reference
  gender?: string;
  appearance?: string;
  clothing?: string;
}

export interface PropAsset {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface LocationAsset {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export type CameraPan = "none" | "left" | "right";
export type CameraTilt = "none" | "up" | "down";
export type CameraZoom = "none" | "in" | "out";
export type CameraRoll = "none" | "clockwise" | "counter_clockwise";
export type CameraSpeed = "normal" | "slow" | "fast";
export type CameraStyle = 
  | "auto"
  | "static" 
  | "drone" 
  | "handheld" 
  | "dolly" 
  | "crane" 
  | "orbit" 
  | "fpv" 
  | "panoramic";

export type TimeOfDay = "dawn" | "day" | "afternoon" | "sunset" | "night";
export type MotionCurve = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface CameraSettings {
  pan: CameraPan;
  tilt: CameraTilt;
  zoom: CameraZoom;
  roll: CameraRoll;
  speed: CameraSpeed;
  style: CameraStyle;
  timeOfDay: TimeOfDay;
  motionCurve: MotionCurve;
}

export type GenerationMode = "text-to-video" | "image-to-video" | "reference-to-video";
export type AspectRatio = "16:9" | "4:3" | "1:1" | "9:21" | "9:16";
export type Resolution = "480p" | "720p" | "1080p" | "4k";

export interface GenerationInput {
  prompt: string;
  generation_type: GenerationMode;
  duration: number;
  aspect_ratio: AspectRatio;
  resolution: Resolution;
  generate_audio: boolean;
  watermark: boolean;
  web_search: boolean;
  return_last_frame: boolean;
  seed: number;
  image_urls?: string[];
  video_urls?: string[];
  audio_urls?: string[];
}

export interface VideoTask {
  id: string;
  status: "queued" | "generating" | "completed" | "failed";
  created_at: number;
  model: string;
  failed_reason: string | null;
  input?: GenerationInput; // Stored locally for replay
  sceneTitle?: string;       // AI Director metadata for perfect temporal continuity
  clipNumber?: number;       // AI Director metadata for perfect temporal continuity
  data?: {
    results?: string[];
    video_expires_at?: string;
    last_frame_url?: string | null;
    processing_time?: number;
  } | null;
}
