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
 * Normalizes a string for fuzzy matching:
 * - Removes accents (á→a, é→e, ñ→n)
 * - Converts to lowercase
 * - Removes special characters
 */
function normalizeForMatching(text: string): string {
  return text
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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
 * 
 * IMPORTANT: This function preserves the EXACT order of mentions in the prompt.
 * Each mention gets its own slot in the image array, even if it's the same asset.
 * This ensures [Image1], [Image2], etc. in the compiled prompt match image_urls[0], image_urls[1], etc.
 */
export function harvestAndSortRefImages(
  prompt: string,
  characters: CharacterAsset[],
  props: PropAsset[],
  locations: LocationAsset[]
): string[] {
  const imageUrls: string[] = [];
  
  // Create a UUID-based map for precise asset lookup
  // Maps normalized name → { uuid, imageUrl }
  const assetMap = new Map<string, { uuid: string; imageUrl: string }>(); 
  
  characters.forEach(c => {
    if (!c.avatarUrl) return;
    const normalized = normalizeForMatching(c.name);
    assetMap.set(normalized, { uuid: c.id, imageUrl: c.avatarUrl });
  });
  
  props.forEach(p => {
    if (!p.imageUrl) return;
    const normalized = normalizeForMatching(p.name);
    assetMap.set(normalized, { uuid: p.id, imageUrl: p.imageUrl });
  });
  
  locations.forEach(l => {
    if (!l.imageUrl) return;
    const normalized = normalizeForMatching(l.name);
    assetMap.set(normalized, { uuid: l.id, imageUrl: l.imageUrl });
  });
  
  // Find all @mentions in order (including duplicates)
  // Match @word (letters, numbers, accents)
  const mentionPattern = /@([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+)/g;
  const matches = prompt.matchAll(mentionPattern);
  
  for (const match of matches) {
    const mentionText = match[1]; // e.g., "lia" or "Lía" from "@lia" or "@Lía"
    const normalized = normalizeForMatching(mentionText);
    const assetData = assetMap.get(normalized);
    
    if (assetData) {
      console.log(`[UUID Match] @${mentionText} → UUID: ${assetData.uuid}`);
      imageUrls.push(assetData.imageUrl);
    }
  }
  
  // Limit to 9 images (VideoGenAPI constraint)
  return imageUrls.slice(0, 9);
}

/**
 * Combines the user raw prompt, compiles the camera motions, and expands asset tags.
 * 
 * IMPROVED: Processes @mentions sequentially left-to-right, ensuring each mention
 * gets its own [ImageX] reference that matches the image_urls array index.
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
  const refImages = selectedRefImages ? selectedRefImages.slice(0, 9) : [];

  // Detect if the prompt contains Spanish words or characters
  const isSpanish = /[áéíóúüñ]/.test(rawPrompt) || /\b(el|la|los|las|un|una|en|de|con|para|por|como|que|y|o)\b/i.test(rawPrompt);

  // Create UUID-based lookup maps for all assets
  // Uses normalized names for fuzzy matching (handles accents, case, etc.)
  const assetLookup = new Map<string, { type: 'character' | 'prop' | 'location'; uuid: string; asset: any }>();
  
  characters.forEach(c => {
    const normalized = normalizeForMatching(c.name);
    assetLookup.set(normalized, { type: 'character', uuid: c.id, asset: c });
  });
  
  props.forEach(p => {
    const normalized = normalizeForMatching(p.name);
    assetLookup.set(normalized, { type: 'prop', uuid: p.id, asset: p });
  });
  
  locations.forEach(l => {
    const normalized = normalizeForMatching(l.name);
    assetLookup.set(normalized, { type: 'location', uuid: l.id, asset: l });
  });

  // Process all @mentions sequentially, replacing them with enriched descriptions + [ImageX]
  let compiled = rawPrompt;
  let imageIndex = 0; // Tracks current position in refImages array
  
  // Find all @mentions in order (supports accents: @lia, @Lía, etc.)
  const mentionPattern = /@([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+)/g;
  const matches = [...compiled.matchAll(mentionPattern)];
  
  // Process from right to left to preserve string indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const mentionText = match[1]; // e.g., "lia" or "Lía"
    const normalized = normalizeForMatching(mentionText);
    const matchIndex = match.index!;
    const matchText = match[0]; // e.g., "@lia"
    
    const assetInfo = assetLookup.get(normalized);
    
    // Debug logging with UUID
    if (assetInfo) {
      console.log(`[UUID Compile] @${mentionText} → UUID: ${assetInfo.uuid} (${assetInfo.type})`);
    }
    
    if (!assetInfo) {
      // Not a recognized asset, leave as-is
      continue;
    }
    
    const { type, asset } = assetInfo;
    let replacement = "";
    let hasImage = false;
    
    // Calculate the actual image index for THIS specific mention
    // We need to count how many @mentions with images appear BEFORE this one
    const mentionsBeforeThis = matches.slice(0, i);
    let imageIndexForThisMention = 0;
    
    for (const prevMatch of mentionsBeforeThis) {
      const prevMentionText = prevMatch[1];
      const prevNormalized = normalizeForMatching(prevMentionText);
      const prevAssetInfo = assetLookup.get(prevNormalized);
      
      if (prevAssetInfo) {
        const prevAsset = prevAssetInfo.asset;
        const prevHasImage = 
          (prevAssetInfo.type === 'character' && prevAsset.avatarUrl) ||
          (prevAssetInfo.type === 'prop' && prevAsset.imageUrl) ||
          (prevAssetInfo.type === 'location' && prevAsset.imageUrl);
        
        if (prevHasImage) {
          imageIndexForThisMention++;
        }
      }
    }
    
    // Build replacement text based on asset type
    if (type === 'character') {
      const char = asset as CharacterAsset;
      hasImage = !!char.avatarUrl;
      
      const details: string[] = [];
      if (char.description) details.push(char.description.trim());
      if (char.appearance) details.push(char.appearance.trim());
      if (char.clothing) details.push(char.clothing.trim());
      if (char.gender) details.push(char.gender.trim());
      
      const detailsStr = details.filter(Boolean).join(", ");
      const detailsSuffix = detailsStr ? ` (${detailsStr})` : "";
      
      let refToken = "";
      if (hasImage && imageIndexForThisMention < refImages.length) {
        refToken = isSpanish 
          ? ` [Image${imageIndexForThisMention + 1}]` 
          : ` [Image${imageIndexForThisMention + 1}]`;
      }

      replacement = isSpanish 
        ? `${char.name}${refToken}${detailsSuffix}`
        : `character named ${char.name}${refToken}${detailsSuffix}`;
        
    } else if (type === 'prop') {
      const prop = asset as PropAsset;
      hasImage = !!prop.imageUrl;
      
      const desc = prop.description ? prop.description.trim() : "";
      const descSuffix = desc ? ` (${desc})` : "";
      
      let refToken = "";
      if (hasImage && imageIndexForThisMention < refImages.length) {
        refToken = isSpanish 
          ? ` [Image${imageIndexForThisMention + 1}]` 
          : ` [Image${imageIndexForThisMention + 1}]`;
      }

      replacement = isSpanish 
        ? `el objeto ${prop.name}${refToken}${descSuffix}`
        : `prop: ${prop.name}${refToken}${descSuffix}`;
        
    } else if (type === 'location') {
      const loc = asset as LocationAsset;
      hasImage = !!loc.imageUrl;
      
      const desc = loc.description ? loc.description.trim() : "";
      const descSuffix = desc ? ` (${desc})` : "";
      
      let refToken = "";
      if (hasImage && imageIndexForThisMention < refImages.length) {
        refToken = isSpanish 
          ? ` [Image${imageIndexForThisMention + 1}]` 
          : ` [Image${imageIndexForThisMention + 1}]`;
      }

      replacement = isSpanish 
        ? `en la locación ${loc.name}${refToken}${descSuffix}`
        : `at the location ${loc.name}${refToken}${descSuffix}`;
    }
    
    // Replace this specific occurrence
    compiled = compiled.substring(0, matchIndex) + replacement + compiled.substring(matchIndex + matchText.length);
  }

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
