/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CameraSettings, CharacterAsset, PropAsset, LocationAsset } from "./types";

/**
 * Normalizes an asset name into an @handle
 * e.g., "Cyber Hacker Lucas" -> "@CyberHackerLucas"
 */
export function getAssetHandle(name: string): string {
  const cleanName = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .trim();
  return `@${cleanName}`;
}

/**
 * Compiles Higgsfield-style camera settings into a descriptive prompt fragment
 */
export function compileCameraPrompt(settings: CameraSettings): string {
  const parts: string[] = [];

  // 1. Camera Style / Lens descriptor
  let styleDesc = "";
  switch (settings.style) {
    case "static":
      styleDesc = "static studio shot, locked tripod lock-on";
      break;
    case "drone":
      styleDesc = "cinematic drone shot, aerial flyover perspective";
      break;
    case "handheld":
      styleDesc = "raw handheld shaky cam style, documentary look";
      break;
    case "dolly":
      styleDesc = "dolly zoom vertigo effect, smooth track-in motion";
      break;
    case "crane":
      styleDesc = "sweeping crane shot, vertical high-angle sweep";
      break;
    case "orbit":
      styleDesc = "orbiting 360-degree camera spin, steady rotation around subject";
      break;
    case "fpv":
      styleDesc = "dynamic FPV racing drone shot, fast acrobatic camera weave";
      break;
    case "panoramic":
      styleDesc = "panoramic wide lens sweep, capturing extreme wide scenery";
      break;
    default:
      styleDesc = "cinematic camera movement";
  }

  // 2. Camera Motions (Pan, Tilt, Zoom, Roll)
  const motions: string[] = [];
  const speedPrefix = settings.speed === "slow" ? "slowly " : settings.speed === "fast" ? "rapidly " : "smoothly ";

  if (settings.pan === "left") motions.push(`${speedPrefix}panning left`);
  if (settings.pan === "right") motions.push(`${speedPrefix}panning right`);
  
  if (settings.tilt === "up") motions.push(`${speedPrefix}tilting up`);
  if (settings.tilt === "down") motions.push(`${speedPrefix}tilting down`);

  if (settings.zoom === "in") motions.push(`${speedPrefix}zooming in`);
  if (settings.zoom === "out") motions.push(`${speedPrefix}zooming out`);

  if (settings.roll === "clockwise") motions.push(`${speedPrefix}rolling clockwise`);
  if (settings.roll === "counter_clockwise") motions.push(`${speedPrefix}rolling counter-clockwise`);

  // Combine motions
  let motionDesc = "";
  if (motions.length > 0) {
    if (motions.length === 1) {
      motionDesc = motions[0];
    } else if (motions.length === 2) {
      motionDesc = `${motions[0]} and ${motions[1]}`;
    } else {
      const last = motions.pop();
      motionDesc = `${motions.join(", ")}, and ${last}`;
    }
  }

  // Final compilation
  if (settings.style === "static" && motions.length === 0) {
    return "static shot, no camera motion";
  }

  const cameraParts = [styleDesc];
  if (motionDesc) {
    cameraParts.push(motionDesc);
  }

  return cameraParts.join(", ");
}

/**
 * Harvests reference images from characters, props, and locations mentioned in the prompt,
 * and sorts them by the order they appear in the prompt text.
 */
export function harvestAndSortRefImages(
  prompt: string,
  characters: CharacterAsset[],
  props: PropAsset[],
  locations: LocationAsset[]
): string[] {
  const detected: Array<{ imageUrl: string; index: number }> = [];
  const lowercasePrompt = prompt.toLowerCase();

  // Helper to find the first occurrence index of either handle or raw name
  const getMinIndex = (name: string): number => {
    const handle = getAssetHandle(name).toLowerCase();
    const plain = name.toLowerCase();
    
    const handleIdx = lowercasePrompt.indexOf(handle);
    const plainIdx = lowercasePrompt.indexOf(plain);
    
    if (handleIdx !== -1 && plainIdx !== -1) {
      return Math.min(handleIdx, plainIdx);
    }
    if (handleIdx !== -1) return handleIdx;
    if (plainIdx !== -1) return plainIdx;
    return -1;
  };

  characters.forEach(c => {
    if (!c.avatarUrl) return;
    const idx = getMinIndex(c.name);
    if (idx !== -1) {
      if (!detected.some(item => item.imageUrl === c.avatarUrl)) {
        detected.push({ imageUrl: c.avatarUrl, index: idx });
      }
    }
  });

  props.forEach(p => {
    if (!p.imageUrl) return;
    const idx = getMinIndex(p.name);
    if (idx !== -1) {
      if (!detected.some(item => item.imageUrl === p.imageUrl)) {
        detected.push({ imageUrl: p.imageUrl, index: idx });
      }
    }
  });

  locations.forEach(l => {
    if (!l.imageUrl) return;
    const idx = getMinIndex(l.name);
    if (idx !== -1) {
      if (!detected.some(item => item.imageUrl === l.imageUrl)) {
        detected.push({ imageUrl: l.imageUrl, index: idx });
      }
    }
  });

  // Sort by index of appearance in the prompt
  detected.sort((a, b) => a.index - b.index);

  return detected.map(item => item.imageUrl);
}

/**
 * Combines the user raw prompt, compiles the camera motions, and expands asset tags
 */
export function compileFinalPrompt(
  rawPrompt: string,
  characters: CharacterAsset[],
  props: PropAsset[],
  locations: LocationAsset[],
  cameraSettings: CameraSettings,
  selectedRefImages?: string[],
  hasReferenceVideo?: boolean
): { compiled: string; cameraPrompt: string } {
  let compiled = rawPrompt;
  const refImages = selectedRefImages ? selectedRefImages.slice(0, 9) : [];

  // Detect if the prompt contains Spanish words or characters
  const isSpanish = /[áéíóúüñ]/.test(rawPrompt) || /\b(el|la|los|las|un|una|en|de|con|para|por|como|que|y|o)\b/i.test(rawPrompt);

  // 1. Replace character handles and names with robust and rich visual attributes and Seedance [ImageX] references
  characters.forEach((char) => {
    const handle = getAssetHandle(char.name);
    const escapedHandle = handle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedName = char.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match either the handle (e.g. @Juan) or the plain name as a whole word (e.g. Juan)
    const regex = new RegExp(`${escapedHandle}|\\b${escapedName}\\b`, "gi");
    
    compiled = compiled.replace(regex, (match, offset) => {
      // Check if there is already an "Imagen X", "Image X", or "[ImageX]" within the next 35 characters
      const subsequentText = compiled.slice(offset + match.length, offset + match.length + 35).toLowerCase();
      const hasExistingRef = /\b(imagen|image|img|imágen)\b/i.test(subsequentText) || /\[image/i.test(subsequentText);
      
      const details: string[] = [];
      if (char.description) details.push(char.description.trim());
      if (char.appearance) details.push(char.appearance.trim());
      if (char.clothing) details.push(char.clothing.trim());
      if (char.gender) details.push(char.gender.trim());
      
      const detailsStr = details.filter(Boolean).join(", ");
      const detailsSuffix = detailsStr ? ` (${detailsStr})` : "";
      
      let refToken = "";
      if (char.avatarUrl && !hasExistingRef) {
        const idx = refImages.indexOf(char.avatarUrl);
        if (idx !== -1) {
          refToken = isSpanish 
            ? ` [Image${idx + 1}] (de la Imagen ${idx + 1})` 
            : ` [Image${idx + 1}]`;
        }
      }

      if (isSpanish) {
        return `${char.name}${refToken}${detailsSuffix}`;
      } else {
        return `character named ${char.name}${refToken}${detailsSuffix}`;
      }
    });
  });

  // 2. Replace prop handles and names and Seedance [ImageX] references
  props.forEach((prop) => {
    const handle = getAssetHandle(prop.name);
    const escapedHandle = handle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedName = prop.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`${escapedHandle}|\\b${escapedName}\\b`, "gi");
    
    compiled = compiled.replace(regex, (match, offset) => {
      const subsequentText = compiled.slice(offset + match.length, offset + match.length + 35).toLowerCase();
      const hasExistingRef = /\b(imagen|image|img|imágen)\b/i.test(subsequentText) || /\[image/i.test(subsequentText);
      
      const desc = prop.description ? prop.description.trim() : "";
      const descSuffix = desc ? ` (${desc})` : "";
      
      let refToken = "";
      if (prop.imageUrl && !hasExistingRef) {
        const idx = refImages.indexOf(prop.imageUrl);
        if (idx !== -1) {
          refToken = isSpanish 
            ? ` [Image${idx + 1}] (de la Imagen ${idx + 1})` 
            : ` [Image${idx + 1}]`;
        }
      }

      if (isSpanish) {
        return `el objeto ${prop.name}${refToken}${descSuffix}`;
      } else {
        return `prop: ${prop.name}${refToken}${descSuffix}`;
      }
    });
  });

  // 3. Replace location handles and names and Seedance [ImageX] references
  locations.forEach((loc) => {
    const handle = getAssetHandle(loc.name);
    const escapedHandle = handle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedName = loc.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`${escapedHandle}|\\b${escapedName}\\b`, "gi");
    
    compiled = compiled.replace(regex, (match, offset) => {
      const subsequentText = compiled.slice(offset + match.length, offset + match.length + 35).toLowerCase();
      const hasExistingRef = /\b(imagen|image|img|imágen)\b/i.test(subsequentText) || /\[image/i.test(subsequentText);
      
      const desc = loc.description ? loc.description.trim() : "";
      const descSuffix = desc ? ` (${desc})` : "";
      
      let refToken = "";
      if (loc.imageUrl && !hasExistingRef) {
        const idx = refImages.indexOf(loc.imageUrl);
        if (idx !== -1) {
          refToken = isSpanish 
            ? ` [Image${idx + 1}] (de la Imagen ${idx + 1})` 
            : ` [Image${idx + 1}]`;
        }
      }

      if (isSpanish) {
        return `en la locación ${loc.name}${refToken}${descSuffix}`;
      } else {
        return `at the location ${loc.name}${refToken}${descSuffix}`;
      }
    });
  });

  // 4. Compile camera motion prompt
  const cameraPrompt = compileCameraPrompt(cameraSettings);

  // 5. Append camera prompt to final prompt
  let finalPrompt = compiled.trim();
  if (cameraPrompt) {
    // Check if it already ends in punctuation
    if (finalPrompt && !finalPrompt.endsWith(",") && !finalPrompt.endsWith(".")) {
      finalPrompt += ", " + cameraPrompt;
    } else {
      finalPrompt += " " + cameraPrompt;
    }
  }

  if (hasReferenceVideo) {
    const continuityInstruction = isSpanish
      ? "[CONTINUIDAD: Genera este video como la secuencia de continuidad temporal directa y lógica de la escena anterior, manteniendo idénticos los personajes, vestuarios, iluminación, fondo y ritmo visual]"
      : "[CONTINUITY: Generate this video as the direct temporal and logical sequence of the previous scene, maintaining identical characters, clothing, lighting, environment background, and visual rhythm]";
    finalPrompt = `${continuityInstruction} ${finalPrompt}`;
  }

  return {
    compiled: finalPrompt,
    cameraPrompt
  };
}
