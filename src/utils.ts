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
// Character height proportions for the animated series (in meters)
// CRITICAL: These proportions MUST be maintained for visual consistency
const CHARACTER_HEIGHTS: Record<string, string> = {
  "lia": "small child 1 meter tall, half the height of adult Tomas",
  "noah": "small child 1 meter tall, half the height of adult Tomas", 
  "tomas": "TALL ADULT MALE 1.7 meters, significantly taller and larger than the small children Lia and Noah",
  "tomás": "TALL ADULT MALE 1.7 meters, significantly taller and larger than the small children Lia and Noah",
  "coco": "bipedal iguana 0.65 meters tall, WALKS ON TWO LEGS like cartoon character, reaches to children's elbows"
};

// Location and prop scale proportions for the animated series
const LOCATION_PROPORTIONS: Record<string, string> = {
  "isla": "isla tropical pequeña aprox 50m diámetro, playa arena blanca, agua turquesa, palmeras 8-10m altura, muelle madera 15m, cabaña rústica puerta 2m altura (más alta que Tomás), rocas volcánicas",
  "island": "small tropical island approx 50m diameter, white sand beach, turquoise water, palm trees 8-10m height, wooden dock 15m, rustic cabin door 2m tall (taller than Tomás), volcanic rocks",
  "casa": "wooden cabin, main door is 2 meters tall (taller than Tomás)",
  "house": "wooden cabin, main door is 2 meters tall (taller than Tomás)"
};

// Base animated series visual style - ALWAYS applied
const SERIES_BASE_STYLE = "high-quality 3D Pixar-style animation, detailed subsurface scattering on skin, cinematic depth of field, photorealistic textures on wood fabric and sand, vibrant natural color palette, soft rim lighting, Disney-level character rendering";

export function compileCameraPrompt(settings: CameraSettings): string {
  const parts: string[] = [];

  // 1. Time of Day - Always applied (Animated Series Look)
  let timeOfDayPrompt = "";
  switch (settings.timeOfDay) {
    case "dawn":
      timeOfDayPrompt = "soft golden sunrise, warm peachy-orange sky with pink and purple gradient, gentle morning glow on characters faces, long soft shadows on sand, crystal-clear turquoise water with golden reflections, magical nostalgic atmosphere, early dawn lighting 6am";
      break;
    case "day":
      timeOfDayPrompt = "bright midday sunlight, clear vibrant blue sky with defined white clouds, strong natural overhead lighting, highly saturated tropical colors, sparkling turquoise ocean water, sharp but soft shadows, high noon 12pm lighting, energetic daylight atmosphere";
      break;
    case "afternoon":
      timeOfDayPrompt = "warm late afternoon golden hour light, honey-toned sunlight at 45-degree angle, lengthening soft shadows, comfortable warm color temperature, beginning of magic hour, 4pm lighting with golden rim lights on characters";
      break;
    case "sunset":
      timeOfDayPrompt = "dramatic cinematic sunset, deep orange and coral sky blending into soft purple clouds, golden hour rim lighting on characters silhouettes, long romantic shadows, glowing horizon over turquesa water, magical ethereal 6pm atmosphere, warm nostalgic glow";
      break;
    case "night":
      timeOfDayPrompt = "nighttime after-hours atmosphere, soft moonlight or warm practical indoor lights, deep blue hour tones if outdoors, gentle star-filled sky, cool ambient shadows with warm accent lights, cozy evening 8pm mood";
      break;
  }

  // 2. Camera Style / Lens descriptor (only if not "auto")
  let styleDesc = "";
  if (settings.style !== "auto") {
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
        styleDesc = "";
    }
  }

  // 3. Motion Curve descriptor
  let motionCurveDesc = "";
  switch (settings.motionCurve) {
    case "linear":
      motionCurveDesc = "steady constant-speed movement";
      break;
    case "ease-in":
      motionCurveDesc = "starting slow and accelerating smoothly";
      break;
    case "ease-out":
      motionCurveDesc = "starting fast and decelerating to gentle stop";
      break;
    case "ease-in-out":
      motionCurveDesc = "starting slow, accelerating mid-way, then decelerating smoothly";
      break;
  }

  // 4. Camera Motions (Pan, Tilt, Zoom, Roll)
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
  // Always start with base series style
  parts.push(SERIES_BASE_STYLE);
  
  // Always include time of day
  parts.push(timeOfDayPrompt);

  // Add camera style if not auto
  if (styleDesc) {
    parts.push(styleDesc);
  }

  // Add motion details
  if (motionDesc) {
    parts.push(motionDesc);
    if (motionCurveDesc) {
      parts.push(motionCurveDesc);
    }
  }

  return parts.join(", ");
}

/**
 * Harvests reference images from characters, props, and locations mentioned in the prompt.
 * 
 * CRITICAL CHANGE: Returns images in ALPHABETICAL ORDER by asset name, not mention order.
 * This ensures each asset ALWAYS gets the same [ImageX] number across different prompts.
 * 
 * Example:
 * - Prompt 1: "@tomas @lia bailan" → [lia.jpg, tomas.jpg] (alphabetical)
 * - Prompt 2: "@lia @tomas cantan" → [lia.jpg, tomas.jpg] (same order!)
 * - Result: Lia is ALWAYS [Image1], Tomas is ALWAYS [Image2]
 */
export function harvestAndSortRefImages(
  prompt: string,
  characters: CharacterAsset[],
  props: PropAsset[],
  locations: LocationAsset[]
): string[] {
  // Create a UUID-based map for precise asset lookup
  // Maps normalized name → { uuid, name, imageUrl }
  const assetMap = new Map<string, { uuid: string; name: string; imageUrl: string }>(); 
  
  characters.forEach(c => {
    if (!c.avatarUrl) return;
    const normalized = normalizeForMatching(c.name);
    assetMap.set(normalized, { uuid: c.id, name: c.name, imageUrl: c.avatarUrl });
  });
  
  props.forEach(p => {
    if (!p.imageUrl) return;
    const normalized = normalizeForMatching(p.name);
    assetMap.set(normalized, { uuid: p.id, name: p.name, imageUrl: p.imageUrl });
  });
  
  locations.forEach(l => {
    if (!l.imageUrl) return;
    const normalized = normalizeForMatching(l.name);
    assetMap.set(normalized, { uuid: l.id, name: l.name, imageUrl: l.imageUrl });
  });
  
  // Find all UNIQUE @mentions in the prompt
  const mentionPattern = /@([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+)/g;
  const matches = prompt.matchAll(mentionPattern);
  const uniqueAssets = new Set<string>(); // Set of UUIDs
  const assetsByUuid = new Map<string, { name: string; imageUrl: string }>(); // UUID → asset data
  
  for (const match of matches) {
    const mentionText = match[1];
    const normalized = normalizeForMatching(mentionText);
    const assetData = assetMap.get(normalized);
    
    if (assetData) {
      uniqueAssets.add(assetData.uuid);
      assetsByUuid.set(assetData.uuid, { name: assetData.name, imageUrl: assetData.imageUrl });
    }
  }
  
  // Sort assets ALPHABETICALLY by name (case-insensitive)
  const sortedAssets = Array.from(uniqueAssets)
    .map(uuid => ({ uuid, ...assetsByUuid.get(uuid)! }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  
  // Log the consistent ordering
  console.log('[Consistent Image Order - harvestAndSortRefImages]');
  sortedAssets.forEach((asset, idx) => {
    console.log(`  [Image${idx + 1}] ${asset.name} (UUID: ${asset.uuid})`);
  });
  
  // Return image URLs in alphabetical order
  const imageUrls = sortedAssets.map(a => a.imageUrl);
  
  console.log('[Image URLs being sent to API]');
  imageUrls.slice(0, 9).forEach((url, idx) => {
    console.log(`  [Image${idx + 1}] ${url}`);
  });
  
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
  const assetLookup = new Map<string, { type: 'character' | 'prop' | 'location'; uuid: string; name: string; asset: any }>();
  const assetByUuid = new Map<string, { type: 'character' | 'prop' | 'location'; uuid: string; name: string; asset: any }>();
  
  characters.forEach(c => {
    const normalized = normalizeForMatching(c.name);
    const assetInfo = { type: 'character' as const, uuid: c.id, name: c.name, asset: c };
    assetLookup.set(normalized, assetInfo);
    assetByUuid.set(c.id, assetInfo);
  });
  
  props.forEach(p => {
    const normalized = normalizeForMatching(p.name);
    const assetInfo = { type: 'prop' as const, uuid: p.id, name: p.name, asset: p };
    assetLookup.set(normalized, assetInfo);
    assetByUuid.set(p.id, assetInfo);
  });
  
  locations.forEach(l => {
    const normalized = normalizeForMatching(l.name);
    const assetInfo = { type: 'location' as const, uuid: l.id, name: l.name, asset: l };
    assetLookup.set(normalized, assetInfo);
    assetByUuid.set(l.id, assetInfo);
  });
  
  // Build consistent image index mapping
  // GROUP BY IMAGE URL - assets sharing the same image URL get the same [ImageX] index
  const mentionedAssets = new Set<string>(); // Set of UUIDs
  const tempPattern = /@([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+)/g;
  for (const match of rawPrompt.matchAll(tempPattern)) {
    const normalized = normalizeForMatching(match[1]);
    const assetInfo = assetLookup.get(normalized);
    if (assetInfo && refImages.length > 0) {
      mentionedAssets.add(assetInfo.uuid);
    }
  }
  
  // Get all mentioned assets with their image URLs
  const mentionedAssetsWithImages = Array.from(mentionedAssets)
    .map(uuid => assetByUuid.get(uuid))
    .filter(Boolean);
  
  // Group assets by their image URL - assets with same URL share same [ImageX] index
  const imageUrlToIndex = new Map<string, number>();
  const uniqueImageUrls: string[] = [];
  
  mentionedAssetsWithImages.forEach(assetInfo => {
    let imageUrl = '';
    if (assetInfo!.type === 'character') {
      imageUrl = (assetInfo!.asset as CharacterAsset).avatarUrl || '';
    } else if (assetInfo!.type === 'prop') {
      imageUrl = (assetInfo!.asset as PropAsset).imageUrl || '';
    } else if (assetInfo!.type === 'location') {
      imageUrl = (assetInfo!.asset as LocationAsset).imageUrl || '';
    }
    
    if (imageUrl && !imageUrlToIndex.has(imageUrl)) {
      uniqueImageUrls.push(imageUrl);
      imageUrlToIndex.set(imageUrl, uniqueImageUrls.length); // 1-indexed
    }
  });
  
  // Create UUID → Image Index mapping (via image URL)
  const uuidToImageIndex = new Map<string, number>();
  mentionedAssetsWithImages.forEach(assetInfo => {
    let imageUrl = '';
    if (assetInfo!.type === 'character') {
      imageUrl = (assetInfo!.asset as CharacterAsset).avatarUrl || '';
    } else if (assetInfo!.type === 'prop') {
      imageUrl = (assetInfo!.asset as PropAsset).imageUrl || '';
    } else if (assetInfo!.type === 'location') {
      imageUrl = (assetInfo!.asset as LocationAsset).imageUrl || '';
    }
    
    if (imageUrl) {
      const index = imageUrlToIndex.get(imageUrl) || 0;
      uuidToImageIndex.set(assetInfo!.uuid, index);
    }
  });
  
  // Log the mapping for debugging
  console.log('[UUID → Image Index Mapping (Grouped by Image URL)]');
  mentionedAssetsWithImages.forEach(assetInfo => {
    const index = uuidToImageIndex.get(assetInfo!.uuid) || 0;
    console.log(`  ${assetInfo!.name} (${assetInfo!.uuid}) → [Image${index}]`);
  });

  // Process all @mentions sequentially, replacing them with enriched descriptions + [ImageX]
  let compiled = rawPrompt;
  
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
    
    if (!assetInfo) {
      // Not a recognized asset, leave as-is
      continue;
    }
    
    const { type, uuid, asset } = assetInfo;
    let replacement = "";
    let hasImage = false;
    
    // Get CONSISTENT image index from alphabetical ordering
    // This ensures @lia ALWAYS gets the same number (e.g., [Image1])
    const imageIndexForThisMention = uuidToImageIndex.get(uuid) || 0;
    
    // Debug logging - log EVERY mention replacement
    if (imageIndexForThisMention > 0) {
      console.log(`[Mention Replacement] @${mentionText} (${assetInfo.name}) → [Image${imageIndexForThisMention}] (UUID: ${uuid})`);
    } else {
      console.log(`[Mention Replacement] @${mentionText} (${assetInfo.name}) → NO IMAGE (UUID: ${uuid})`);
    }
    
    // Build replacement text based on asset type
    if (type === 'character') {
      const char = asset as CharacterAsset;
      hasImage = !!char.avatarUrl;
      
      // Get character height proportion from the series bible
      const heightInfo = CHARACTER_HEIGHTS[normalized];
      
      let refToken = "";
      let detailsSuffix = "";
      
      if (hasImage && imageIndexForThisMention > 0) {
        // HAS IMAGE: Use minimal prompt - trust the reference image
        refToken = ` [Image${imageIndexForThisMention}]`;
        
        // CRITICAL: Force Tomás to use reference image with emphatic instruction
        if (normalized === 'tomas' || normalized === 'tomás') {
          const forceRefInstruction = isSpanish
            ? " ⚠️ USAR IMAGEN DE REFERENCIA"
            : " ⚠️ USE REFERENCE IMAGE";
          refToken += forceRefInstruction;
        }
        
        // Only add height info, NOT full description (image shows the rest)
        detailsSuffix = heightInfo ? ` (${heightInfo})` : "";
        
      } else {
        // NO IMAGE: Use full description as fallback
        const details: string[] = [];
        if (char.description) details.push(char.description.trim());
        if (char.appearance) details.push(char.appearance.trim());
        if (char.clothing) details.push(char.clothing.trim());
        if (char.gender) details.push(char.gender.trim());
        if (heightInfo) details.push(heightInfo);
        
        const detailsStr = details.filter(Boolean).join(", ");
        detailsSuffix = detailsStr ? ` (${detailsStr})` : "";
      }

      replacement = isSpanish 
        ? `${char.name}${refToken}${detailsSuffix}`
        : `character named ${char.name}${refToken}${detailsSuffix}`;
        
    } else if (type === 'prop') {
      const prop = asset as PropAsset;
      hasImage = !!prop.imageUrl;
      
      let refToken = "";
      let descSuffix = "";
      
      if (hasImage && imageIndexForThisMention > 0) {
        // HAS IMAGE: Minimal prompt
        refToken = ` [Image${imageIndexForThisMention}] ⚠️ USAR IMAGEN`;
        // Don't add full description, image shows it
        descSuffix = "";
      } else {
        // NO IMAGE: Use full description
        const desc = prop.description ? prop.description.trim() : "";
        descSuffix = desc ? ` (${desc})` : "";
      }

      replacement = isSpanish 
        ? `el objeto ${prop.name}${refToken}${descSuffix}`
        : `prop: ${prop.name}${refToken}${descSuffix}`;
        
    } else if (type === 'location') {
      const loc = asset as LocationAsset;
      hasImage = !!loc.imageUrl;
      
      // Add location proportions from the series bible
      const proportionInfo = LOCATION_PROPORTIONS[normalized];
      
      let refToken = "";
      let descSuffix = "";
      
      if (hasImage && imageIndexForThisMention > 0) {
        // HAS IMAGE: Minimal prompt + proportions only
        // For multi-view locations, use special wording that prevents combining views
        const isMultiViewLocation = normalized === 'isla' || normalized === 'island';
        const imageRef = isMultiViewLocation
          ? ` [Image${imageIndexForThisMention}] 🎬 REFERENCIA DE DISEÑO (elegir UNA vista apropiada para la acción, NO combinar todas las vistas en una sola escena)`
          : ` [Image${imageIndexForThisMention}] ⚠️ USAR ELEMENTOS DE LA IMAGEN`;
        refToken = imageRef;
        descSuffix = proportionInfo ? ` (${proportionInfo})` : "";
      } else {
        // NO IMAGE: Use full description
        const desc = loc.description ? loc.description.trim() : "";
        const descWithProportions = proportionInfo 
          ? (desc ? `${desc}, ${proportionInfo}` : proportionInfo)
          : desc;
        descSuffix = descWithProportions ? ` (${descWithProportions})` : "";
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

  // 4.5. Build SCALE REFERENCE prefix if multiple characters are mentioned
  // IMPORTANT: Sort by height (tallest first) to emphasize the contrast
  let scaleReference = "";
  const mentionedCharacters = mentionedAssetsWithImages
    .filter(a => a?.type === 'character')
    .map(a => a!.asset as CharacterAsset);
  
  if (mentionedCharacters.length >= 2) {
    // Sort characters by height priority: adults first, then children, then animals
    const heightPriority: Record<string, number> = {
      'tomas': 1, 'tomás': 1,  // Adults first
      'lia': 2, 'noah': 2,      // Children second
      'coco': 3                 // Animals last
    };
    
    const sortedByHeight = [...mentionedCharacters].sort((a, b) => {
      const aPrio = heightPriority[normalizeForMatching(a.name)] || 999;
      const bPrio = heightPriority[normalizeForMatching(b.name)] || 999;
      return aPrio - bPrio;
    });
    
    const scaleDescriptions: string[] = [];
    
    sortedByHeight.forEach(char => {
      const normalized = normalizeForMatching(char.name);
      const heightDesc = CHARACTER_HEIGHTS[normalized];
      if (heightDesc) {
        scaleDescriptions.push(`${char.name} is ${heightDesc}`);
      }
    });
    
    if (scaleDescriptions.length >= 2) {
      // Check if Tomás is mentioned to add reference image enforcement
      const tomasMentioned = mentionedCharacters.find(c => {
        const norm = normalizeForMatching(c.name);
        return norm === 'tomas' || norm === 'tomás';
      });
      
      // Get Tomas's actual image index if he's mentioned
      const tomasImageIndex = tomasMentioned ? (uuidToImageIndex.get(tomasMentioned.id) || 1) : 1;
      
      const maintainInstruction = isSpanish
        ? `CRITICAL: Mantener estas proporciones exactas. Tomas DEBE verse mucho más alto y grande que los niños.${tomasMentioned ? ` ⚠️ TOMAS: USAR IMAGEN DE REFERENCIA [Image${tomasImageIndex}] OBLIGATORIAMENTE (overol azul, gafas naranjas, pelo afro, cinturón herramientas).` : ''}`
        : `CRITICAL: Maintain exact proportions. Tomas MUST appear much taller and larger than the children.${tomasMentioned ? ` ⚠️ TOMAS: USE REFERENCE IMAGE [Image${tomasImageIndex}] MANDATORY (blue overalls, orange glasses, afro hair, tool belt).` : ''}`;
      
      scaleReference = isSpanish
        ? `[ESCALA OBLIGATORIA: ${scaleDescriptions.join('; ')}. ${maintainInstruction}] `
        : `[MANDATORY SCALE: ${scaleDescriptions.join('; ')}. ${maintainInstruction}] `;
    }
  }

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
  
  // Prepend scale reference at the very beginning
  if (scaleReference) {
    finalPrompt = scaleReference + finalPrompt;
  }
  
  // MULTI-VIEW LOCATION INSTRUCTION: Add at the very beginning if there's a multi-view location
  const mentionedLocations = Object.keys(mentioned).filter(key => assetLookup.get(key)?.type === 'location');
  const hasMultiViewLocation = mentionedLocations.some(locKey => {
    const loc = assetLookup.get(locKey)?.asset as LocationAsset;
    const normalized = normalizeForMatching(loc?.name || '');
    return (normalized === 'isla' || normalized === 'island') && loc?.imageUrl;
  });
  
  let multiViewLocationInstruction = "";
  if (hasMultiViewLocation) {
    multiViewLocationInstruction = isSpanish
      ? "[🎬 INSTRUCCIÓN CRÍTICA LOCACIÓN MULTI-VISTA: La imagen de referencia de la isla muestra 4 PANELES (vista aérea, frontal, lateral, detalle) que son DIFERENTES ÁNGULOS DE LA MISMA ISLA. Estos paneles son SOLO REFERENCIA DE DISEÑO para conocer cómo se ve la isla. PROHIBIDO renderizar los 4 paneles simultáneamente en la escena. PROHIBIDO crear 2 o más islas/casas. ELEGIR UNA vista apropiada para la acción (por ejemplo: si camina en la playa usar vista frontal/lateral, si vuela usar vista aérea). La escena debe mostrar UNA SOLA isla coherente, NO una mezcla de todos los paneles juntos.] "
      : "[🎬 CRITICAL MULTI-VIEW LOCATION INSTRUCTION: The island reference image shows 4 PANELS (aerial, frontal, lateral, detail) which are DIFFERENT ANGLES OF THE SAME ISLAND. These panels are ONLY DESIGN REFERENCE to know what the island looks like. FORBIDDEN to render all 4 panels simultaneously in the scene. FORBIDDEN to create 2 or more islands/houses. CHOOSE ONE appropriate view for the action (e.g., if walking on beach use frontal/lateral view, if flying use aerial view). The scene must show ONE SINGLE coherent island, NOT a mixture of all panels together.] ";
  }
  
  // GLOBAL RULE: Do not add elements not explicitly mentioned
  // Build character count instruction
  let characterCountInstruction = "";
  if (mentionedCharacters.length > 0) {
    const charNames = mentionedCharacters.map(c => c.name).join(', ');
    characterCountInstruction = isSpanish
      ? `[⚠️ CONTEO EXACTO: SOLO ${mentionedCharacters.length} personaje(s) en escena: ${charNames}. NO duplicar ningún personaje. NO agregar personas extras. EXACTAMENTE ${mentionedCharacters.length} personaje(s), ni más ni menos.] `
      : `[⚠️ EXACT COUNT: ONLY ${mentionedCharacters.length} character(s) in scene: ${charNames}. DO NOT duplicate any character. DO NOT add extra people. EXACTLY ${mentionedCharacters.length} character(s), no more no less.] `;
  }
  
  const noExtraElementsInstruction = isSpanish
    ? "[🚫 REGLA GLOBAL ESTRICTA: NO agregar personajes, objetos, animales o elementos adicionales que no estén EXPLÍCITAMENTE mencionados en el prompt. SOLO renderizar exactamente lo que se pide. NO inventar extras, personas de fondo, props adicionales, herramientas, utensilios, o elementos decorativos. Si no está mencionado textualmente en el prompt o como [ImageX], NO debe aparecer en la escena. PROHIBIDO agregar elementos de contexto o ambiente no solicitados.] "
    : "[🚫 STRICT GLOBAL RULE: DO NOT add characters, objects, animals or additional elements that are not EXPLICITLY mentioned in the prompt. ONLY render exactly what is requested. DO NOT invent extras, background people, additional props, tools, utensils, or decorative elements. If it's not textually mentioned in the prompt or as [ImageX], it should NOT appear in the scene. FORBIDDEN to add context or environment elements not requested.] ";
  
  finalPrompt = multiViewLocationInstruction + characterCountInstruction + noExtraElementsInstruction + finalPrompt;
  
  // Add emphatic reference image instruction at the very start if there are character images
  if (mentionedCharacters.length > 0 && refImages.length > 0) {
    const tomasMentioned = mentionedCharacters.find(c => {
      const norm = normalizeForMatching(c.name);
      return norm === 'tomas' || norm === 'tomás';
    });
    
    if (tomasMentioned) {
      // Build dynamic image list based on actual unique images
      const imageListParts: string[] = [];
      for (let i = 1; i <= uniqueImageUrls.length; i++) {
        imageListParts.push(`[Image${i}]`);
      }
      const imageListStr = imageListParts.join(', ');
      
      // Find Tomas's actual image index
      const tomasImageIndex = uuidToImageIndex.get(tomasMentioned.id) || 1;
      
      const refImageInstruction = isSpanish
        ? `[⚠️ INSTRUCCIÓN CRÍTICA: Usar EXACTAMENTE las imágenes de referencia ${imageListStr} para cada personaje mencionado. ESPECIALMENTE Tomas [Image${tomasImageIndex}] DEBE verse IDÉNTICO a la imagen de referencia con overol azul, gafas naranjas, pelo afro y cinturón de herramientas. NO inventar apariencias alternativas.] `
        : `[⚠️ CRITICAL INSTRUCTION: Use EXACTLY the reference images ${imageListStr} for each character mentioned. ESPECIALLY Tomas [Image${tomasImageIndex}] MUST look IDENTICAL to reference image with blue overalls, orange glasses, afro hair and tool belt. DO NOT invent alternative appearances.] `;
      
      finalPrompt = refImageInstruction + finalPrompt;
    }
  }

  if (hasReferenceVideo) {
    const continuityInstruction = isSpanish
      ? "[CONTINUIDAD: Genera este video como la secuencia de continuidad temporal directa y lógica de la escena anterior, manteniendo idénticos los personajes, vestuarios, iluminación, fondo y ritmo visual]"
      : "[CONTINUITY: Generate this video as the direct temporal and logical sequence of the previous scene, maintaining identical characters, clothing, lighting, environment background, and visual rhythm]";
    finalPrompt = `${continuityInstruction} ${finalPrompt}`;
  }

  console.log('[FINAL COMPILED PROMPT]');
  console.log(finalPrompt);
  console.log('---');

  return {
    compiled: finalPrompt,
    cameraPrompt
  };
}
