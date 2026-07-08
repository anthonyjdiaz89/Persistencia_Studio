import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import sizeOf from "image-size";
import { Jimp } from "jimp";

dotenv.config();

// Simple in-memory task database for webhooks
const webhookTasksStore = new Map<string, any>();

async function startServer() {
  const app = express();
  // Use PORT from environment (Cloud Run, Heroku, etc.) or default to 3000 for local dev
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Create uploads directory if it does not exist
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve static uploaded files
  app.use("/uploads", express.static(uploadsDir));

  // Helper to upload files to tmpfiles.org for public direct access
  const uploadToTmpFiles = async (buffer: Buffer, filename: string, mimeType: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      formData.append("file", blob, filename);
      formData.append("expire", "86400"); // 1 day expiration

      console.log(`[TmpFiles Upload] Uploading ${filename} (${mimeType}) to tmpfiles.org...`);
      const res = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        console.error(`[TmpFiles Upload] Upload failed with status ${res.status}`);
        return null;
      }

      const json = await res.json() as any;
      if (json.status === "success" && json.data && json.data.url) {
        // Direct download URL: replace tmpfiles.org/ with tmpfiles.org/dl/
        const directUrl = json.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
        console.log(`[TmpFiles Upload] Success! Public Direct URL: ${directUrl}`);
        return directUrl;
      }
    } catch (err) {
      console.error("[TmpFiles Upload] Error uploading to tmpfiles.org:", err);
    }
    return null;
  };

  // Helper to ensure an image URL meets minimum dimensions (300px) required by VideoGenAPI
  const ensureMinImageDimensions = async (url: string, req: express.Request): Promise<string> => {
    try {
      // 1. Unsplash dynamic size replacement
      if (url.includes("images.unsplash.com")) {
        // Upgrade any w=X to w=600 to satisfy min-width requirements
        return url.replace(/w=\d+/g, "w=600");
      }

      // 2. Filter for potential images
      const isImage = /\.(jpg|jpeg|png|webp|gif|bmp)(?:[?#]|$)/i.test(url) || url.includes("avatar") || url.includes("image");
      if (!isImage) {
        return url;
      }

      console.log(`[Image Dimension Enforcer] Fetching ${url} to verify dimensions...`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[Image Dimension Enforcer] Failed to fetch image ${url} for resizing`);
        return url;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let dimensions;
      try {
        dimensions = sizeOf(buffer);
      } catch (err) {
        console.warn(`[Image Dimension Enforcer] Failed to read dimensions of ${url}:`, err);
        return url;
      }

      const minBound = 300;
      if (dimensions && dimensions.width && dimensions.height) {
        const width = dimensions.width;
        const height = dimensions.height;

        if (width < minBound || height < minBound) {
          console.log(`[Image Dimension Enforcer] Image is too small (${width}x${height}). Upscaling to meet 300px minimum...`);

          const ratio = Math.max(minBound / width, minBound / height);
          const targetWidth = Math.round(width * ratio);
          const targetHeight = Math.round(height * ratio);

          const jimpImage = await Jimp.read(buffer);
          jimpImage.resize({ w: targetWidth, h: targetHeight });
          
          let mimeType = "image/jpeg";
          if (dimensions.type === "png") mimeType = "image/png";
          else if (dimensions.type === "webp") mimeType = "image/webp";
          else if (dimensions.type === "gif") mimeType = "image/gif";

          const resizedBuffer = await jimpImage.getBuffer(mimeType as any);

          const ext = dimensions.type || "jpg";
          const filename = `upscaled_${Date.now()}_${Math.floor(Math.random() * 100000)}.${ext}`;
          const filePath = path.join(uploadsDir, filename);
          fs.writeFileSync(filePath, resizedBuffer);

          const publicUrl = await uploadToTmpFiles(resizedBuffer, filename, mimeType);
          if (publicUrl) {
            console.log(`[Image Dimension Enforcer] Successfully upscaled and uploaded to ${publicUrl}`);
            return publicUrl;
          }

          let host = req.get("host") || "";
          if (host.includes("ais-dev-")) {
            host = host.replace("ais-dev-", "ais-pre-");
          }
          return `https://${host}/uploads/${filename}`;
        }
      }
    } catch (error) {
      console.error("[Image Dimension Enforcer] Error enforcing image dimensions:", error);
    }
    return url;
  };

  // Helper to normalize image/video URLs to public HTTPS URLs (no localhost, no data URIs)
  const normalizeImageUrls = async (urls: string[], req: express.Request): Promise<string[]> => {
    if (!urls || !Array.isArray(urls)) return [];
    let host = req.get("host") || "";
    
    // Rewrite dev app host (behind authentication proxy) to public pre/shared app host
    if (host.includes("ais-dev-")) {
      host = host.replace("ais-dev-", "ais-pre-");
    }

    const results: string[] = [];

    for (const url of urls) {
      if (!url) {
        results.push(url);
        continue;
      }
      let targetUrl = url;

      // Handle relative paths
      if (targetUrl.startsWith("/")) {
        targetUrl = `https://${host}${targetUrl}`;
      }

      // Convert local dev server URLs to public ingress HTTPS URLs
      if (targetUrl.includes("localhost:") || targetUrl.includes("127.0.0.1:")) {
        targetUrl = targetUrl
          .replace(/localhost:\d+/g, host)
          .replace(/127\.0\.0\.1:\d+/g, host);
        // Force protocol to https for external accessibility
        if (targetUrl.startsWith("http://")) {
          targetUrl = targetUrl.replace("http://", "https://");
        }
      }

      // Also rewrite any explicit references to the dev app host in the URL
      if (targetUrl.includes("ais-dev-")) {
        targetUrl = targetUrl.replace("ais-dev-", "ais-pre-");
      }

      if (targetUrl.startsWith("data:")) {
        try {
          const matches = targetUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            let buffer = Buffer.from(base64Data, "base64");
            let extension = "jpg";
            if (mimeType.includes("png")) extension = "png";
            else if (mimeType.includes("webp")) extension = "webp";
            else if (mimeType.includes("gif")) extension = "gif";
            else if (mimeType.includes("mp4")) extension = "mp4";
            else if (mimeType.includes("webm")) extension = "webm";
            else if (mimeType.includes("quicktime")) extension = "mov";
            else if (mimeType.includes("ogg")) extension = "ogg";
            
            // Upscale image if it's below 300px on either side
            if (mimeType.startsWith("image/")) {
              try {
                const dimensions = sizeOf(buffer);
                const minBound = 300;
                if (dimensions && dimensions.width && dimensions.height) {
                  const width = dimensions.width;
                  const height = dimensions.height;
                  if (width < minBound || height < minBound) {
                    console.log(`[data URI Resizer] Image is too small (${width}x${height}). Upscaling to meet 300px minimum...`);
                    const ratio = Math.max(minBound / width, minBound / height);
                    const targetWidth = Math.round(width * ratio);
                    const targetHeight = Math.round(height * ratio);

                    const jimpImage = await Jimp.read(buffer);
                    jimpImage.resize({ w: targetWidth, h: targetHeight });
                    buffer = await jimpImage.getBuffer(mimeType as any);
                  }
                }
              } catch (e) {
                console.warn("[data URI Resizer] Error checking or resizing base64 image:", e);
              }
            }

            const filename = `auto_${Date.now()}_${Math.floor(Math.random() * 100000)}.${extension}`;
            const filePath = path.join(uploadsDir, filename);
            fs.writeFileSync(filePath, buffer);

            // Upload directly to tmpfiles.org for public access
            const publicUrl = await uploadToTmpFiles(buffer, filename, mimeType);
            if (publicUrl) {
              results.push(publicUrl);
              continue;
            }

            targetUrl = `https://${host}/uploads/${filename}`;
          }
        } catch (e) {
          console.error("[normalizeImageUrls] Error decoding data URL:", e);
        }
      }

      // Check if it's a local/relative URL or reference to /uploads/
      const isLocalUpload = targetUrl.includes("/uploads/");
      if (isLocalUpload) {
        try {
          // Extract the filename from the end of the URL path
          const urlParts = targetUrl.split("/uploads/");
          if (urlParts.length > 1) {
            const filename = urlParts[1].split(/[?#]/)[0]; // strip query parameters
            const filePath = path.join(uploadsDir, filename);
            if (fs.existsSync(filePath)) {
              let buffer = fs.readFileSync(filePath);
              const ext = path.extname(filename).toLowerCase();
              let mimeType = "application/octet-stream";
              if (ext === ".png") mimeType = "image/png";
              else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
              else if (ext === ".webp") mimeType = "image/webp";
              else if (ext === ".gif") mimeType = "image/gif";
              else if (ext === ".mp4") mimeType = "video/mp4";
              else if (ext === ".webm") mimeType = "video/webm";
              else if (ext === ".mov") mimeType = "video/quicktime";

              const isImg = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
              if (isImg) {
                try {
                  const dimensions = sizeOf(buffer);
                  const minBound = 300;
                  if (dimensions && dimensions.width && dimensions.height) {
                    const width = dimensions.width;
                    const height = dimensions.height;
                    if (width < minBound || height < minBound) {
                      console.log(`[Local Image Resizer] Local image ${filename} is too small (${width}x${height}). Upscaling to 300px min...`);
                      const ratio = Math.max(minBound / width, minBound / height);
                      const targetWidth = Math.round(width * ratio);
                      const targetHeight = Math.round(height * ratio);

                      const jimpImage = await Jimp.read(buffer);
                      jimpImage.resize({ w: targetWidth, h: targetHeight });
                      buffer = await jimpImage.getBuffer(mimeType as any);
                      fs.writeFileSync(filePath, buffer);
                    }
                  }
                } catch (e) {
                  console.warn("[Local Image Resizer] Error checking/resizing local upload:", e);
                }
              }

              const publicUrl = await uploadToTmpFiles(buffer, filename, mimeType);
              if (publicUrl) {
                results.push(publicUrl);
                continue;
              }
            }
          }
        } catch (err) {
          console.error("[normalizeImageUrls] Error uploading local file to tmpfiles.org:", err);
        }
      }

      if (targetUrl && (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))) {
        targetUrl = await ensureMinImageDimensions(targetUrl, req);
      }

      results.push(targetUrl);
    }

    return results;
  };

  // API Route: Upload Image (converts base64 to public https URL)
  app.post("/api/upload", (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image content provided" });
      }

      if (image.startsWith("http://") || image.startsWith("https://")) {
        return res.json({ url: image });
      }

      if (!image.startsWith("data:")) {
        return res.status(400).json({ error: "Invalid image format. Must be base64 data URI." });
      }

      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid base64 data format" });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      let extension = "jpg";
      if (mimeType.includes("png")) extension = "png";
      else if (mimeType.includes("webp")) extension = "webp";
      else if (mimeType.includes("gif")) extension = "gif";

      const filename = `upload_${Date.now()}_${Math.floor(Math.random() * 100000)}.${extension}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);

      let host = req.get("host") || "";
      if (host.includes("ais-dev-")) {
        host = host.replace("ais-dev-", "ais-pre-");
      }
      const url = `https://${host}/uploads/${filename}`;

      console.log(`[Upload API] Saved file to ${filePath}. Public URL: ${url}`);
      return res.json({ url });
    } catch (err: any) {
      console.error("[Upload API] Error handling upload:", err);
      return res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  // Lazy-loaded Gemini AI client
  let geminiClient: any = null;
  const getGeminiClient = () => {
    if (!geminiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required to run the AI Director. Please configure it in your Secrets settings.");
      }
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
    return geminiClient;
  };

  // API Route: Health Check and Config
  app.get("/api/config", (req, res) => {
    // Verificar qué variables están configuradas
    const apiKeyStatus = {
      VIDEOGEN_API_KEY: !!process.env.VIDEOGEN_API_KEY,
      VIDEOGEN_API_KEY_1: !!process.env.VIDEOGEN_API_KEY_1,
      VIDEOGEN_API_KEY_2: !!process.env.VIDEOGEN_API_KEY_2,
      VIDEOGEN_API_KEY_3: !!process.env.VIDEOGEN_API_KEY_3,
      VIDEOGEN_API_KEY_4: !!process.env.VIDEOGEN_API_KEY_4,
      VIDEOGEN_API_KEY_5: !!process.env.VIDEOGEN_API_KEY_5,
      SEEDANCE_API_KEY: !!process.env.SEEDANCE_API_KEY
    };
    
    const hasAnyApiKey = Object.values(apiKeyStatus).some(v => v === true);
    
    res.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '3000',
      hasApiKey: hasAnyApiKey,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasSupabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      multiKeyEnabled: apiKeys.length > 1,
      totalKeys: apiKeys.length,
      apiKeyStatus: apiKeyStatus,
      diagnostic: hasAnyApiKey 
        ? `✅ ${apiKeys.length} API key(s) loaded successfully`
        : '❌ NO API KEYS DETECTED - Check environment variables in Coolify Dashboard → Environment'
    });
  });

  // API Route: Multi-Key Status Monitor
  app.get("/api/keys/status", (req, res) => {
    const now = Date.now();
    const keysStatus = apiKeys.map((keyInfo, idx) => ({
      index: idx + 1,
      alias: keyInfo.alias,
      keyPreview: `${keyInfo.key.substring(0, 15)}...${keyInfo.key.substring(keyInfo.key.length - 4)}`,
      isAvailable: keyInfo.isAvailable || now >= keyInfo.rateLimitResetTime,
      currentUsage: keyInfo.currentUsage,
      limit: keyInfo.limit,
      resetInSeconds: keyInfo.rateLimitResetTime > now 
        ? Math.ceil((keyInfo.rateLimitResetTime - now) / 1000) 
        : 0,
      resetTime: keyInfo.rateLimitResetTime > 0 
        ? new Date(keyInfo.rateLimitResetTime).toISOString() 
        : null
    }));
    
    const availableCount = keysStatus.filter(k => k.isAvailable).length;
    
    res.json({
      success: true,
      totalKeys: apiKeys.length,
      availableKeys: availableCount,
      keys: keysStatus,
      loadBalancingActive: apiKeys.length > 1
    });
  });

  // API Route: Firebase Config Delivery
  app.get("/api/firebase-config", (req, res) => {
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return res.json(config);
      }
      return res.status(404).json({ error: "Firebase config not found" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route: Supabase Config Delivery
  app.get("/api/supabase-config", (req, res) => {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

      console.log("[Supabase Config] URL:", supabaseUrl);
      console.log("[Supabase Config] Key:", supabaseAnonKey ? `${supabaseAnonKey.substring(0, 30)}...` : 'undefined');

      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ 
          error: "Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env" 
        });
      }

      return res.json({
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route: Proxy Video for HTML5 Canvas Frame Extraction with CORS headers
  app.get("/api/proxy-video", async (req, res) => {
    const videoUrl = req.query.url as string;
    if (!videoUrl) {
      return res.status(400).send("Missing video URL");
    }
    try {
      console.log(`[Video Proxy] Proxying video: ${videoUrl}`);
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) {
        return res.status(videoRes.status).send(`Failed to fetch video: ${videoRes.statusText}`);
      }
      
      const contentType = videoRes.headers.get("content-type") || "video/mp4";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      
      const arrayBuffer = await videoRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.send(buffer);
    } catch (err: any) {
      console.error("[Video Proxy] Error proxying video:", err);
      return res.status(500).send(err.message || "Failed to proxy video");
    }
  });

  // API Route: AI Director Scene Composing and Storyboarding
  app.post("/api/ai-director/compose", async (req, res) => {
    const { model = "gemini", thinking = false, prompt: userPrompt, history = [], attachedImageUrls = [], characters = [], props = [], locations = [], referenceFrames = [] } = req.body;

    if (!userPrompt) {
      return res.status(400).json({ error: "Scene prompt is required" });
    }

    try {
      const client = getGeminiClient();

      // Compilar historial para darle contexto continuo al director
      const historyText = (history || [])
        .map((m: any) => `[${m.sender === "user" ? "USUARIO" : "DIRECTOR DE CINE"}] (${m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ""}): ${m.text}`)
        .join("\n\n");

      // Normalize all base64 images inside inputs on-the-fly to ensure Gemini receives concise public URLs
      const normalizedCharacters = [];
      for (const c of characters || []) {
        normalizedCharacters.push({
          ...c,
          avatarUrl: c.avatarUrl ? (await normalizeImageUrls([c.avatarUrl], req))[0] : undefined
        });
      }

      const normalizedProps = [];
      for (const p of props || []) {
        normalizedProps.push({
          ...p,
          imageUrl: p.imageUrl ? (await normalizeImageUrls([p.imageUrl], req))[0] : undefined
        });
      }

      const normalizedLocations = [];
      for (const l of locations || []) {
        normalizedLocations.push({
          ...l,
          imageUrl: l.imageUrl ? (await normalizeImageUrls([l.imageUrl], req))[0] : undefined
        });
      }

      const normalizedReferenceFrames = [];
      for (const rf of referenceFrames || []) {
        normalizedReferenceFrames.push({
          ...rf,
          imageUrl: rf.imageUrl ? (await normalizeImageUrls([rf.imageUrl], req))[0] : undefined
        });
      }

      const normalizedAttachedImageUrls = await normalizeImageUrls(attachedImageUrls, req);

      const characterList = normalizedCharacters.map((c: any) => `- @${c.name}: ${c.description} ${c.avatarUrl ? `(URL del avatar: ${c.avatarUrl})` : ""}`).join("\n");
      const propList = normalizedProps.map((p: any) => `- @${p.name}: ${p.description} ${p.imageUrl ? `(URL de imagen: ${p.imageUrl})` : ""}`).join("\n");
      const locationList = normalizedLocations.map((l: any) => `- @${l.name}: ${l.description} ${l.imageUrl ? `(URL de imagen: ${l.imageUrl})` : ""}`).join("\n");
      const referenceFramesList = normalizedReferenceFrames.map((rf: any) => `- [Frame de Referencia] Nombre: ${rf.name}, Descripcion: ${rf.description}, URL: ${rf.imageUrl}`).join("\n");
      const attachedImagesList = normalizedAttachedImageUrls.map((url: string, idx: number) => `- [Imagen Adjunta del Chat #${idx + 1}] URL: ${url}`).join("\n");

      const systemInstruction = `You are an expert Hollywood Film Director and Cinematic AI Copilot.
Your job is to take a high-level scene description and compose a professional, coherent, sequential multi-clip story blueprint (a list of 3 to 6 sequential shots/clips).

The generated scene blueprint MUST be visually consistent, meaning:
1. Characters, locations, and props MUST retain their appearance, clothes, and style across shots.
2. Shot lighting and mood MUST carry over logically.
3. The ending state of one shot should transition into the beginning state of the next shot (e.g., if shot 1 ends with someone opening a door, shot 2 should start with them entering).

CRITICAL REGLAS DE DIRECCIÓN CREATIVA (ESTILO MUSICAL DISNEY / PIXAR):
- El director de escena opera bajo un concepto de "Momento Musical de Serie Animada" en el más puro estilo clásico de Disney o Pixar.
- Las historias de los clips deben ser altamente creativas, divertidas, expresivas y llenas de vida.
- La función principal es que el storyboard y los clips resultantes narren visual y coreográficamente de forma exacta lo que está diciendo o transmitiendo la canción (contando lo que habla la canción a través de las acciones de los personajes).
- Utiliza una coreografía visual imaginativa, gestos expresivos de personajes, comedia física, bailes, gesticulación y cambios de escenario que se sincronicen con el ritmo musical.
- Diseña clips con duraciones de hasta 15 segundos por clip (preferiblemente entre 10 y 15 segundos cada uno para dar suficiente espacio al desarrollo del momento musical y coreográfico) y genera entre 3 y 6 clips secuenciales para lograr una continuidad perfecta que aproveche todo el metraje disponible (aprovechar al máximo los 15 segundos de vídeo).

CRITICAL PROMPT ENGINEERING RULES FROM SEEDANCE 2.0 ADVANCED CINEMATOGRAPHY MANUAL:
For each clip's 'prompt' field, you must write a meticulously detailed, professional-grade visual screenplay following this precise structure:

1. **TECHNICAL SPECIFICATIONS & STYLE OVERVIEW**:
   - Explicitly declare the visual style (e.g., "3D animated Pixar-style scene", "Cinematic photo-real live action", "Anime style").
   - Define a specific musical rhythm, tempo, or BPM if relevant (e.g., "Musical sequence — 129.2 BPM center tempo, one quarter-note beat every 11.1 frames").
   - Prefer physical and bodily expression over mouth movement if appropriate (e.g., "No character sings in camera — mouths closed throughout. All expression physical. Exactly one of each character — no duplicates").

2. **LOCATION & LIGHTING SETUP**:
   - Specify the exact location handle (e.g., "LOCATION: @Neo Tokyo Alley - rocky cave interior...").
   - Detail the lighting (e.g., "Warm shaft of light entering from above illuminating the center... atmospheric dust particles floating in the light").

3. **STATE FROM FRAME ONE**:
   - Describe what characters are holding or doing, and which props are active from the very first frame. (e.g., "PROPS FROM FRAME ONE: @Plasma Blade in @Kaelen's hands — already playing/active from frame one").

4. **METICULOUS TIMECODE & BEAT BREAKDOWN**:
   - Break down the visual actions step-by-step using exact timecodes, frame counts, or beats. (e.g.:
     - "00:00:00:00 — PRE-ROLL — 8 frames: Wide establishing shot. All characters in position, everything still..."
     - "00:00:00:09 — C1 B1 — INTRO: @Kaelen does X..."
     - "00:00:04:12 — Next action: @Nebula Beast moves Y...").
     This level of precision is highly desired for creating dynamic and sync'd edits.

5. **CONTINUITY & INCOMING/OUTGOING MATCHES (CORTE HORNEADO)**:
   - For all clips (except the first), establish continuity by referencing the previous video (e.g., "Video continuity reference: [CLIP 1 GENERATED VIDEO]").
   - Explicitly describe the final frames of the clip as the outgoing transition point to ensure a seamless cut. (e.g., "00:00:15:00 — OUTGOING SHOT (corte horneado). Final 11 frames: wide shot showing... This framing is the incoming shot of Clip 2").
   - Guide the generation to transition naturally from the previous shot's ending posture.

6. **FOLEY & SOUND DESIGN CUES**:
   - Provide explicit sync instructions for background sound, echo, and foley (e.g., "Sound: do not generate new audio. Foley: @Plasma Blade humming, steps echoing on the stone floor, atmospheric silence...").

7. **GLOBAL STYLE & STABILIZATION STAMP**:
   - End with a strict parameter block to ensure flicker-free rendering and consistent proportions (e.g., "Global style: 3D animated Pixar-style, cinematic color grade, soft atmospheric lighting, consistent character body proportions, stable picture, no flickering").

SEEDANCE 2.0 MULTIMODAL REFERENCE RULES ("Imagen N" & "Video N"):
- If a clip uses one or more of the created assets ([CHARACTERS], [PROPS], [LOCATIONS], [REFERENCE FRAMES]), you MUST:
  a) Include their exact URLs in the clip's 'image_urls' list (order matters, starting with index 0 as Imagen 1, index 1 as Imagen 2, etc.).
  b) In the clip's 'prompt' text, refer to them explicitly as "Imagen 1", "Imagen 2", etc. along with their handle tag (e.g., "@Kaelen de la Imagen 1").
- For transitions or video references, describe them as "Video 1" (representing the previous clip) connecting smoothly into "Video 2" (the current clip).

REGLAS ESTRICTAS CONTRA LA ALUCINACIÓN EN ESCENARIOS (LOCACIONES):
- Al redactar los prompts de los clips, tienes PROHIBIDO inventar, añadir, asumir o describir elementos decorativos, fantásticos o geográficos que NO formen parte de la descripción original de la locación creada por el usuario.
- Por ejemplo, si la locación es un escenario de "Cueva" o similar y su descripción no lo especifica, NO debes añadir bajo ninguna circunstancia frases sobre "cristales mágicos brillantes", "diamantes luminosos", "estanques de agua en el suelo", "cascadas", "luces místicas" o "piedras mojadas".
- Debes ceñirte escrupulosamente a la locación original y su imagen de referencia (referenciándola como "de la Imagen N"). Si la descripción de la locación es sencilla, descríbela tal cual en el prompt para evitar que el motor de video altere el escenario agregando elementos no deseados.

GENERAL RULES:
- ALWAYS respond in Spanish! All JSON fields containing user-facing text ('sceneTitle', 'sceneDescription', 'directorCommentary', clip 'title', clip 'prompt', and 'consistencyExplanation') MUST be written in fluent, professional, and inspiring Spanish.
- Use the character, prop, or location handle (e.g., @Kaelen, @Plasma Blade, @Neo Tokyo Alley) EXACTLY as defined. This allows our compiling engine to expand them correctly. Do NOT invent new handles.
- Design highly creative and cinematic shots (angles, focus, lighting, pacing).

You have access to the following cinematic materials/assets created by the user:
[CHARACTERS]
${characterList || "No characters created yet."}

[PROPS]
${propList || "No props created yet."}

[LOCATIONS]
${locationList || "No locations created yet."}

[REFERENCE FRAMES]
${referenceFramesList || "No reference frames uploaded yet."}

[IMÁGENES ADJUNTAS AL MENSAJE ACTUAL]
${attachedImagesList || "No images attached directly to this message."}

[HISTORIAL DE LA CONVERSACIÓN ANTERIOR]
${historyText || "No hay mensajes anteriores en esta sesión."}`;

      console.log("[AI Director] Composing scene blueprint for prompt:", userPrompt);

      let resultObj: any = null;

      if (model === "gemma") {
        console.log("[AI Director] Calling Google Gemma-4-31b-it via NVIDIA NIM...");
        const nvidiaApiKey = process.env.NVIDIA_API_KEY || "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";
        const nvidiaUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

        const systemPrompt = `${systemInstruction}

CRITICAL FORMATTING INSTRUCTION:
You MUST respond ONLY with a valid JSON object matching the JSON schema below. Do NOT wrap your output in anything other than the raw JSON object. If you use a markdown block like \`\`\`json ... \`\`\`, make sure it contains ONLY valid JSON and absolutely no text outside it. Do NOT write any natural language or thinking logs outside of the JSON object itself.

JSON Schema:
{
  "sceneTitle": "...",
  "sceneDescription": "...",
  "directorCommentary": "A message explaining visual pacing, aesthetic choices, and how the scene resolves.",
  "clips": [
    {
      "clipNumber": number,
      "title": "A short descriptive shot name",
      "prompt": "Highly visual cinematic prompt using @Name tags exactly as provided",
      "cameraSettings": {
        "pan": "none" | "left" | "right",
        "tilt": "none" | "up" | "down",
        "zoom": "none" | "in" | "out",
        "roll": "none" | "clockwise" | "counter_clockwise",
        "speed": "normal" | "slow" | "fast",
        "style": "static" | "drone" | "handheld" | "dolly" | "crane" | "orbit" | "fpv" | "panoramic"
      },
      "duration": number (4 to 15),
      "generate_audio": boolean,
      "consistencyExplanation": "Detail how costume/lighting consistency is preserved",
      "image_urls": ["string"]
    }
  ]
}`;

        const payload = {
          model: "google/gemma-4-31b-it",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Compose a consistent multi-clip scene blueprint for: "${userPrompt}"` }
          ],
          max_tokens: thinking ? 16384 : 4096,
          temperature: 1.00,
          top_p: 0.95,
          stream: false,
          chat_template_kwargs: { enable_thinking: thinking }
        };

        const response = await fetch(nvidiaUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${nvidiaApiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`NVIDIA NIM API failed with status ${response.status}: ${errText}`);
        }

        const responseData = await response.json() as any;
        const responseText = responseData.choices?.[0]?.message?.content || "";
        
        if (!responseText) {
          throw new Error("No content received from Gemma 4-31b-it model.");
        }

        let jsonStr = responseText.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```[a-zA-Z]*\s*/, "");
          jsonStr = jsonStr.replace(/\s*```$/, "");
        }
        jsonStr = jsonStr.trim();

        try {
          resultObj = JSON.parse(jsonStr);
        } catch (parseErr) {
          console.warn("[AI Director] Direct JSON parse failed, trying regex extraction...");
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              resultObj = JSON.parse(jsonMatch[0]);
            } catch (innerErr: any) {
              throw new Error(`Failed to parse Gemma output as JSON: ${innerErr.message}. Output was: ${jsonStr}`);
            }
          } else {
            throw new Error(`Failed to find JSON block in Gemma output: ${jsonStr}`);
          }
        }
      } else {
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Compose a consistent multi-clip scene blueprint for: "${userPrompt}"`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sceneTitle: { type: Type.STRING },
                sceneDescription: { type: Type.STRING },
                directorCommentary: { type: Type.STRING, description: "A message from the director explaining the visual pacing, aesthetic choices, and how the scene resolves." },
                clips: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      clipNumber: { type: Type.INTEGER },
                      title: { type: Type.STRING, description: "A short descriptive shot name, e.g., 'Shot 1: Entering the Alley'" },
                      prompt: { type: Type.STRING, description: "Highly visual cinematic prompt. Use the @Name tags exactly as provided (e.g. '@Kaelen walks under the neon lights')." },
                      cameraSettings: {
                        type: Type.OBJECT,
                        properties: {
                          pan: { type: Type.STRING, description: "Must be one of: 'none', 'left', 'right'" },
                          tilt: { type: Type.STRING, description: "Must be one of: 'none', 'up', 'down'" },
                          zoom: { type: Type.STRING, description: "Must be one of: 'none', 'in', 'out'" },
                          roll: { type: Type.STRING, description: "Must be one of: 'none', 'clockwise', 'counter_clockwise'" },
                          speed: { type: Type.STRING, description: "Must be one of: 'normal', 'slow', 'fast'" },
                          style: { type: Type.STRING, description: "Must be one of: 'auto', 'static', 'drone', 'handheld', 'dolly', 'crane', 'orbit', 'fpv', 'panoramic'. Use 'auto' to let camera movement come from the prompt." },
                          timeOfDay: { type: Type.STRING, description: "Must be one of: 'dawn', 'day', 'afternoon', 'sunset', 'night'. Defines the lighting and atmosphere for the animated series look." },
                          motionCurve: { type: Type.STRING, description: "Must be one of: 'linear', 'ease-in', 'ease-out', 'ease-in-out'. Defines the acceleration/deceleration rhythm." }
                        },
                        required: ["pan", "tilt", "zoom", "roll", "speed", "style", "timeOfDay", "motionCurve"]
                      },
                      duration: { type: Type.INTEGER, description: "Between 4 and 15 seconds" },
                      generate_audio: { type: Type.BOOLEAN, description: "Whether audio should be generated" },
                      consistencyExplanation: { type: Type.STRING, description: "Detail how clothing, lighting, facial angles, and items are kept perfectly consistent with previous clips." },
                      image_urls: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of selected reference/avatar/location/attached image URLs to be used for this specific shot/clip to ensure visual, costume, or character likeness consistency. Return the exact URL strings from characters, props, locations, referenceFrames, or attachedImageUrls."
                      }
                    },
                    required: ["clipNumber", "title", "prompt", "cameraSettings", "duration", "generate_audio", "consistencyExplanation"]
                  }
                }
              },
              required: ["sceneTitle", "sceneDescription", "directorCommentary", "clips"]
            }
          }
        });

        const responseText = response.text;
        if (!responseText) {
          throw new Error("No response text received from the AI model.");
        }
        
        console.log("[AI Director] Generation successful. Parsing response...");
        resultObj = JSON.parse(responseText.trim());
      }

      return res.json(resultObj);
    } catch (error: any) {
      console.error("[AI Director] Error composing scene blueprint:", error);
      return res.status(500).json({
        error: {
          code: "internal_error",
          message: error.message || "Failed to contact AI API or parse director's instructions."
        }
      });
    }
  });

  // ============================================================================
  // Multi-API-Key Load Balancing System
  // ============================================================================
  interface ApiKeyInfo {
    key: string;
    alias: string;
    rateLimitResetTime: number; // timestamp when rate limit resets
    isAvailable: boolean;
    currentUsage: number;
    limit: number;
    dailyVideosGenerated: number;  // Track usage in current 15-min window
    dailyResetTime: number;        // When 15-min window resets
  }

  const apiKeys: ApiKeyInfo[] = [];
  
  // Load all API keys from environment (VIDEOGEN_API_KEY_1, VIDEOGEN_API_KEY_2, etc.)
  const loadApiKeys = () => {
    const keys: ApiKeyInfo[] = [];
    
    // Try loading VIDEOGEN_API_KEY_1, VIDEOGEN_API_KEY_2, VIDEOGEN_API_KEY_3
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`VIDEOGEN_API_KEY_${i}`];
      if (key && key.trim()) {
        keys.push({
          key: key.trim(),
          alias: `Key ${i}`,
          rateLimitResetTime: 0,
          isAvailable: true,
          currentUsage: 0,
          limit: 999,  // Unlimited plan
          dailyVideosGenerated: 0,
          dailyResetTime: Date.now() + (15 * 60 * 1000)  // Reset in 15 min (API window)
        });
      }
    }
    
    return keys;
  };

  // Initialize API keys on server start
  apiKeys.push(...loadApiKeys());
  
  // 🔍 DIAGNÓSTICO: Log detallado del entorno
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DIAGNÓSTICO DE VARIABLES DE ENTORNO');
  console.log('='.repeat(70));
  console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`📍 PORT: ${process.env.PORT || 'not set'}`);
  
  // Verificar variables de VideoGenAPI (sin mostrar valores completos)
  const apiKeyVars = [
    'VIDEOGEN_API_KEY',
    'VIDEOGEN_API_KEY_1',
    'VIDEOGEN_API_KEY_2',
    'VIDEOGEN_API_KEY_3',
    'VIDEOGEN_API_KEY_4',
    'VIDEOGEN_API_KEY_5',
    'VIDEOGEN_API_KEY_6',
    'VIDEOGEN_API_KEY_7',
    'VIDEOGEN_API_KEY_8',
    'VIDEOGEN_API_KEY_9',
    'VIDEOGEN_API_KEY_10',
    'SEEDANCE_API_KEY'
  ];
  
  console.log('\n🔑 Variables de API Keys:');
  apiKeyVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✅ ${varName}: ${value.substring(0, 15)}...${value.substring(value.length - 4)} (${value.length} chars)`);
    } else {
      console.log(`  ❌ ${varName}: NO CONFIGURADA`);
    }
  });
  
  // Verificar otras variables importantes
  console.log('\n🗄️ Variables de Base de Datos:');
  console.log(`  ${process.env.SUPABASE_URL ? '✅' : '❌'} SUPABASE_URL: ${process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'NO CONFIGURADA'}`);
  console.log(`  ${process.env.SUPABASE_ANON_KEY ? '✅' : '❌'} SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'NO CONFIGURADA'}`);
  console.log(`  ${process.env.GEMINI_API_KEY ? '✅' : '❌'} GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA (opcional)'}`);
  
  console.log('\n📊 Resultado de Carga de API Keys:');
  console.log(`[Multi-Key System] ${apiKeys.length > 0 ? '✅' : '❌'} Loaded ${apiKeys.length} API key(s) for load balancing`);
  
  if (apiKeys.length === 0) {
    console.log('\n⚠️ ⚠️ ⚠️ ADVERTENCIA CRÍTICA ⚠️ ⚠️ ⚠️');
    console.log('NO SE DETECTARON API KEYS EN LAS VARIABLES DE ENTORNO');
    console.log('El botón de generación estará DESHABILITADO en el frontend');
    console.log('\n📝 Para solucionar:');
    console.log('1. En Coolify Dashboard → Tu aplicación → Environment');
    console.log('2. Agregar variables:');
    console.log('   VIDEOGEN_API_KEY_1=lannetech_tu_key_aqui');
    console.log('   VIDEOGEN_API_KEY_2=lannetech_tu_segunda_key_aqui');
    console.log('3. Guardar y redeploy');
    console.log('='.repeat(70) + '\n');
  } else {
    apiKeys.forEach((keyInfo, idx) => {
      console.log(`  [${idx + 1}] ${keyInfo.alias}: ${keyInfo.key.substring(0, 20)}... (available: ${keyInfo.isAvailable})`);
    });
    console.log('='.repeat(70) + '\n');
  }

  // Reset daily counters when 24h window expires
  setInterval(() => {
    const now = Date.now();
    apiKeys.forEach((keyInfo) => {
      if (now >= keyInfo.dailyResetTime) {
        console.log(`[Multi-Key System] 🔄 ${keyInfo.alias} 15-min window reset: ${keyInfo.dailyVideosGenerated} videos in last window`);
        keyInfo.dailyVideosGenerated = 0;
        keyInfo.dailyResetTime = now + (15 * 60 * 1000); // Next 15-min window
      }
    });
  }, 60 * 1000); // Check every minute

  // Log key status every 5 minutes to track distribution and resets
  setInterval(() => {
    console.log(`\n[Multi-Key System] 📊 Status Report (${new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })} COT):`);
    
    // Calculate total capacity
    const totalGenerated = apiKeys.reduce((sum, k) => sum + k.dailyVideosGenerated, 0);
    const estimatedDailyLimit = apiKeys.length * 10; // Conservative estimate: 10 videos/key/day
    const capacityPercent = ((estimatedDailyLimit - totalGenerated) / estimatedDailyLimit) * 100;
    
    console.log(`  Total videos today: ${totalGenerated} | Est. capacity: ${estimatedDailyLimit} | Remaining: ${Math.max(0, estimatedDailyLimit - totalGenerated)} (${capacityPercent.toFixed(1)}%)`);
    
    if (capacityPercent < 30) {
      console.warn(`  ⚠️ ALERTA: Capacidad diaria < 30%! Considera agregar más API keys.`);
    }
    
    console.log(`  Individual keys:`);
    apiKeys.forEach((keyInfo, idx) => {
      const status = keyInfo.isAvailable ? '🟢 AVAILABLE' : '🔴 RATE-LIMITED';
      const usage = `${keyInfo.currentUsage}/${keyInfo.limit}`;
      const dailyUsage = `${keyInfo.dailyVideosGenerated} videos today`;
      
      let resetInfo = '';
      if (!keyInfo.isAvailable) {
        const now = Date.now();
        const waitSeconds = Math.max(0, Math.ceil((keyInfo.rateLimitResetTime - now) / 1000));
        const waitMinutes = Math.ceil(waitSeconds / 60);
        resetInfo = ` (resets in ${waitMinutes} min)`;
      }
      
      console.log(`    [${idx + 1}] ${keyInfo.alias}: ${status} | Current: ${usage}${resetInfo} | Daily: ${dailyUsage}`);
    });
    console.log('');
  }, 5 * 60 * 1000); // Every 5 minutes

  // Select best available API key (round-robin, always tries — never blocks locally)
  // The API is the source of truth for rate limits, not our internal timer.
  let lastUsedKeyIndex = -1;
  const selectBestAvailableApiKey = (ignoreRateLimit = false): ApiKeyInfo | null => {
    if (apiKeys.length === 0) return null;
    
    const now = Date.now();
    
    // Auto-reset any key whose stored reset time has already passed
    apiKeys.forEach(keyInfo => {
      if (!keyInfo.isAvailable && keyInfo.rateLimitResetTime > 0 && now >= keyInfo.rateLimitResetTime) {
        keyInfo.isAvailable = true;
        keyInfo.currentUsage = 0;
        keyInfo.rateLimitResetTime = 0;
        const t = new Date(now).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour12: false });
        console.log(`[Multi-Key System] 🟢 ${keyInfo.alias} timer expired — marked available again (${t} COT)`);
      }
    });
    
    // For history/status endpoints, always use first key
    if (ignoreRateLimit && apiKeys.length > 0) {
      return apiKeys[0];
    }
    
    // Prefer keys marked available (round-robin)
    for (let i = 0; i < apiKeys.length; i++) {
      lastUsedKeyIndex = (lastUsedKeyIndex + 1) % apiKeys.length;
      const candidate = apiKeys[lastUsedKeyIndex];
      if (candidate.isAvailable) {
        console.log(`[Multi-Key System] Selected ${candidate.alias} (${candidate.currentUsage}/${candidate.limit} used)`);
        return candidate;
      }
    }
    
    // All keys show as rate-limited locally — but we don't know the real API state.
    // Return the key whose stored reset is soonest so we can try it; if the API 
    // is still blocking it will return 429 with real wait time.
    const soonestReset = apiKeys.reduce((earliest, current) => 
      current.rateLimitResetTime < earliest.rateLimitResetTime ? current : earliest
    );
    const waitSec = Math.max(0, Math.ceil((soonestReset.rateLimitResetTime - now) / 1000));
    console.log(`[Multi-Key System] All keys locally rate-limited. Trying ${soonestReset.alias} anyway (reset in ~${Math.ceil(waitSec/60)} min according to local state).`);
    // Mark it as available so the request goes through; the API will confirm or reject
    soonestReset.isAvailable = true;
    soonestReset.currentUsage = 0;
    return soonestReset;
  };

  // Mark a key as rate-limited
  const markKeyAsRateLimited = (keyString: string, resetInSeconds: number) => {
    const keyInfo = apiKeys.find(k => k.key === keyString);
    if (keyInfo) {
      // Cap reset time to 15 minutes max — that's the real API window
      const cappedSeconds = Math.min(resetInSeconds, 15 * 60);
      keyInfo.isAvailable = false;
      keyInfo.rateLimitResetTime = Date.now() + (cappedSeconds * 1000);
      keyInfo.currentUsage = keyInfo.limit;
      
      const resetDate = new Date(keyInfo.rateLimitResetTime);
      const resetTimeCOT = resetDate.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour12: false });
      const resetMinutes = Math.ceil(cappedSeconds / 60);
      
      console.log(`[Multi-Key System] 🔴 ${keyInfo.alias} RATE-LIMITED for ${resetMinutes} min (API reported ${Math.ceil(resetInSeconds/60)} min, capped to 15 min window)`);
      console.log(`[Multi-Key System]    Reset time: ${resetTimeCOT} COT (${resetDate.toISOString()})`);
    }
  };

  // Update key usage count from API response
  const updateKeyUsage = (keyString: string, usage: number, limit: number = 5) => {
    const keyInfo = apiKeys.find(k => k.key === keyString);
    if (keyInfo) {
      keyInfo.currentUsage = usage;
      keyInfo.limit = limit;
      if (usage >= limit) {
        keyInfo.isAvailable = false;
      }
    }
  };

  // Helper to resolve the Seedance/VideoGenAPI API Key (from request headers or load balancer)
  // The API is the source of truth — we always try, never block locally based on timers.
  const getApiKey = (req: express.Request, ignoreRateLimit = false): string | { allKeysExhausted: true; waitSeconds: number; resetTime: string } | null => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ") && authHeader.length > 7) {
      return authHeader.substring(7);
    }
    
    // Use load balancing system — always returns a key (never null when keys exist)
    const selectedKey = selectBestAvailableApiKey(ignoreRateLimit);
    if (selectedKey) {
      return selectedKey.key;
    }
    
    // No keys configured at all
    return null;
  };

  // In-memory rate limiter DISABLED — plan is Unlimited, API is the source of truth.
  // Only 429 responses from the real API should mark keys as rate-limited.
  const enforceGenerationRateLimit = (_apiKey: string, _model: string) => {
    return { limited: false, details: null };
  };
  // Helper to normalize provider errors so the frontend can display actionable validation details.
  const normalizeProviderError = (responseData: any, statusCode: number) => {
    const fallbackMessage = `VideoGenAPI request failed with status ${statusCode}.`;
    const detailsList: string[] = [];

    const pushDetail = (value: any) => {
      if (!value) return;
      if (typeof value === "string") {
        detailsList.push(value);
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") {
            detailsList.push(item);
          } else if (item && typeof item === "object") {
            const field = item.field || item.path || item.loc || item.param || "field";
            const message = item.message || item.msg || item.error || JSON.stringify(item);
            detailsList.push(`${field}: ${message}`);
          }
        }
        return;
      }
      if (typeof value === "object") {
        for (const [key, val] of Object.entries(value)) {
          if (typeof val === "string") {
            detailsList.push(`${key}: ${val}`);
          } else if (Array.isArray(val)) {
            for (const nested of val) {
              detailsList.push(`${key}: ${typeof nested === "string" ? nested : JSON.stringify(nested)}`);
            }
          }
        }
      }
    };

    const baseMessage =
      (responseData && (responseData.message || responseData.error?.message || responseData.error)) ||
      fallbackMessage;

    pushDetail(responseData?.errors);
    pushDetail(responseData?.detail);
    pushDetail(responseData?.details);
    pushDetail(responseData?.error?.details);

    const uniqueDetails = Array.from(new Set(detailsList)).filter(Boolean);
    const finalMessage = uniqueDetails.length > 0
      ? `${baseMessage}\n${uniqueDetails.join("\n")}`
      : baseMessage;

    return {
      error: {
        code: "provider_error",
        message: finalMessage,
        details: uniqueDetails
      },
      message: finalMessage,
      provider: responseData
    };
  };

  // API Route: Validate Seedance / VideoGenAPI Key
  app.post("/api/seedance/validate-key", async (req, res) => {
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(400).json({
        valid: false,
        message: "No API key provided. Please input a valid API Key."
      });
    }

    try {
      console.log("[VideoGenAPI Proxy] Validating API key...");
      const response = await fetch("https://videogenapi.com/api/v1/user", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        let msg = "¡Clave de API válida y conectada con éxito!";
        try {
          const userData = await response.json();
          if (userData && userData.usage) {
            msg += ` (Uso: ${userData.usage.current_month_usage || 0}/${userData.usage.monthly_limit || "sin límite"})`;
          }
        } catch (_) {}
        return res.json({
          valid: true,
          message: msg
        });
      }

      if (response.status === 401) {
        return res.status(401).json({
          valid: false,
          message: "La clave de API ingresada no es válida o está desautorizada."
        });
      }

      return res.status(response.status).json({
        valid: false,
        message: `La validación de la API falló con el código de estado: ${response.status}.`
      });
    } catch (err: any) {
      console.error("[VideoGenAPI Proxy] Validation error:", err);
      return res.status(500).json({
        valid: false,
        message: `Connection error: ${err.message || "Failed to reach VideoGenAPI servers."}`
      });
    }
  });

  // API Route: Proxy Video Generation Task Creation
  app.post("/api/seedance/generations", async (req, res) => {
    const apiKeyResult = getApiKey(req);
    
    // Check if all keys are exhausted
    if (apiKeyResult && typeof apiKeyResult === 'object' && 'allKeysExhausted' in apiKeyResult) {
      return res.status(429).json({
        error: {
          code: "all_keys_rate_limited",
          message: "All API keys are temporarily rate-limited. Please wait before trying again.",
          details: {
            current_usage: apiKeys[0]?.limit || 5,
            limit: apiKeys[0]?.limit || 5,
            window: "varies per key",
            seconds_until_reset: apiKeyResult.waitSeconds,
            reset_time: apiKeyResult.resetTime,
            rule: "All keys exhausted - waiting for earliest reset"
          }
        },
        message: "All API keys rate-limited. Please wait.",
        details: {
          seconds_until_reset: apiKeyResult.waitSeconds,
          reset_time: apiKeyResult.resetTime
        }
      });
    }
    
    if (!apiKeyResult || typeof apiKeyResult !== 'string') {
      return res.status(401).json({
        error: {
          code: "missing_api_key",
          message: "API Key is required. Please set it in the environment variables or supply it in the UI."
        }
      });
    }
    
    const apiKey = apiKeyResult;

    const { model, input, callback_url } = req.body;

    try {
      // Normalize any image_urls & video_urls in input payload (convert relative paths and base64 string inputs to public https URLs)
      const sanitizedInput = { ...input };
      if (sanitizedInput && Array.isArray(sanitizedInput.image_urls)) {
        sanitizedInput.image_urls = await normalizeImageUrls(sanitizedInput.image_urls, req);
      }
      if (sanitizedInput && Array.isArray(sanitizedInput.video_urls)) {
        sanitizedInput.video_urls = await normalizeImageUrls(sanitizedInput.video_urls, req);
      }

      // Map models to supported VideoGenAPI models
      const allowedModels = [
        "seedance-25",
        "veo-31",
        "veo3",
        "sora-2",
        "kling-3",
        "gemini-omni",
        "higgsfield_v1",
        "wan-25",
        "grok-imagine-1-5",
        "seedance-2",
        "seedance-2-mini",
        "ltxv-2",
        "nanobanana-video",
        "veo2",
        "ltxv-13b"
      ];
      let normalizedModel = "seedance-25";
      if (model && allowedModels.includes(model)) {
        normalizedModel = model;
      } else if (model) {
        // Fallback checks for fuzzy matching and backwards compatibility
        if (model.includes("25") && model.includes("seedance")) {
          normalizedModel = "seedance-25";
        } else if (model.includes("mini") && model.includes("seedance")) {
          normalizedModel = "seedance-2-mini";
        } else if (model.includes("seedance")) {
          normalizedModel = "seedance-2";
        } else if (model.includes("sora")) {
          normalizedModel = "sora-2";
        } else if (model.includes("kling")) {
          normalizedModel = "kling-3";
        } else if (model.includes("grok") || model.includes("imagine")) {
          normalizedModel = "grok-imagine-1-5";
        } else if (model.includes("omni") || model.includes("gemini")) {
          normalizedModel = "gemini-omni";
        } else if (model.includes("veo") && model.includes("31")) {
          normalizedModel = "veo-31";
        } else if (model.includes("veo") && model.includes("3")) {
          normalizedModel = "veo3";
        } else if (model.includes("veo") && model.includes("2")) {
          normalizedModel = "veo2";
        } else if (model.includes("higgs")) {
          normalizedModel = "higgsfield_v1";
        } else if (model.includes("wan")) {
          normalizedModel = "wan-25";
        } else if (model.includes("ltxv") && model.includes("2")) {
          normalizedModel = "ltxv-2";
        } else if (model.includes("ltxv") && model.includes("13b")) {
          normalizedModel = "ltxv-13b";
        } else if (model.includes("banana")) {
          normalizedModel = "nanobanana-video";
        }
      }

      const rateLimitCheck = enforceGenerationRateLimit(apiKey, normalizedModel);
      if (rateLimitCheck.limited) {
        return res.status(429).json({
          error: {
            code: "rate_limit_exceeded",
            message: "Rate limit exceeded. Please wait before trying again.",
            details: rateLimitCheck.details
          },
          message: "Too many requests. Please wait before trying again.",
          details: rateLimitCheck.details
        });
      }

      // If callback_url is not specified, but we have APP_URL, we can set up a webhook automatically!
      let finalCallbackUrl = callback_url || (process.env.APP_URL ? `${process.env.APP_URL}/api/seedance/webhook` : undefined);

      if (finalCallbackUrl && finalCallbackUrl.includes("ais-dev-")) {
        finalCallbackUrl = finalCallbackUrl.replace("ais-dev-", "ais-pre-");
      }

      const parsedDuration = Number(sanitizedInput.duration);
      const requestedDuration = Number.isFinite(parsedDuration) && parsedDuration > 0 ? Math.round(parsedDuration) : 5;
      const requestedGenerationType = typeof sanitizedInput.generation_type === "string"
        ? sanitizedInput.generation_type
        : "text-to-video";
      const normalizeAspectRatio = (ratio: any): string => {
        const value = typeof ratio === "string" ? ratio.trim() : "";
        if (value === "16:9" || value === "4:3" || value === "1:1" || value === "9:21") {
          return value;
        }
        if (value === "9:16") return "9:21";
        if (value === "3:4") return "4:3";
        return "16:9";
      };
      const normalizedAspectRatio = normalizeAspectRatio(sanitizedInput.aspect_ratio);
      const enforceTextOnlyForSeedance25 =
        normalizedModel === "seedance-25" &&
        requestedDuration > 10 &&
        requestedGenerationType === "text-to-video";

      // DEBUG: Log received resolution
      console.log(`[VideoGenAPI Proxy] Received resolution: "${sanitizedInput.resolution}" (type: ${typeof sanitizedInput.resolution})`);

      const effectiveImageUrls = enforceTextOnlyForSeedance25
        ? []
        : (Array.isArray(sanitizedInput.image_urls) ? sanitizedInput.image_urls : []);
      const effectiveVideoUrls = enforceTextOnlyForSeedance25
        ? []
        : (Array.isArray(sanitizedInput.video_urls) ? sanitizedInput.video_urls : []);

      const hasReferenceInputs = effectiveImageUrls.length > 0 || effectiveVideoUrls.length > 0;
      const durationRules: Record<string, { min: number; max: number }> = {
        "sora-2": { min: 10, max: 10 },
        "higgsfield_v1": { min: 5, max: 15 },
        "kling-3": { min: 5, max: 10 },
        "seedance-25": { min: 5, max: 30 },
        "gemini-omni": { min: 4, max: 10 },
        "veo3": { min: 8, max: 8 },
        "veo-31": { min: 8, max: 8 },
        "grok-imagine-1-5": { min: 5, max: 10 },
        "seedance-2": { min: 5, max: 10 },
        "nanobanana-video": { min: 5, max: 10 },
        "ltxv-2": { min: 6, max: 10 },
        "ltxv-13b": { min: 1, max: 60 },
        "veo2": { min: 10, max: 10 },
        "seedance-2-mini": { min: 5, max: 15 },
        "wan-25": { min: 5, max: 10 }
      };
      const rule = durationRules[normalizedModel] || { min: 5, max: 30 };
      if (normalizedModel === "seedance-25" && hasReferenceInputs && rule.max > 10) {
        rule.max = 10;
      }
      const isOutOfRange = requestedDuration < rule.min || requestedDuration > rule.max;
      if (isOutOfRange) {
        const rangeText = rule.min === rule.max ? `${rule.max}` : `${rule.min}-${rule.max}`;
        const detailText = rule.min === rule.max
          ? `duration: must be exactly ${rule.max}`
          : `duration: must be between ${rule.min} and ${rule.max}`;
        const modeHint = normalizedModel === "seedance-25" && hasReferenceInputs
          ? " (image/reference mode)"
          : "";
        return res.status(400).json({
          error: {
            code: "validation_error",
            message: `Validation failed\nField 'duration' must be ${rule.min === rule.max ? `exactly ${rule.max}` : `in range ${rangeText}`}${modeHint}`,
            details: [detailText]
          },
          message: `Validation failed\nField 'duration' must be ${rule.min === rule.max ? `exactly ${rule.max}` : `in range ${rangeText}`}${modeHint}`
        });
      }

      // VideoGenAPI expects a flat payload at the root level for `/api/v1/generate`
      const payload: Record<string, any> = {
        model: normalizedModel,
        prompt: sanitizedInput.prompt,
        aspect_ratio: normalizedAspectRatio,
        duration: requestedDuration,
        resolution: sanitizedInput.resolution === "4k" ? "4K" : (sanitizedInput.resolution || "1080p"),
        style: sanitizedInput.style || "realistic",
        add_audio: sanitizedInput.add_audio ?? sanitizedInput.generate_audio ?? false,
        audio_prompt: sanitizedInput.audio_prompt || undefined,
        return_last_frame: sanitizedInput.return_last_frame ?? false,
        web_search: sanitizedInput.web_search ?? false,
        nsfw_checker: sanitizedInput.nsfw_checker ?? false,
        seed: sanitizedInput.seed ? Number(sanitizedInput.seed) : -1,
        ...(finalCallbackUrl ? { callback_url: finalCallbackUrl } : {})
      };

      if (effectiveImageUrls.length > 0) {
        // Use documented fields only: single image -> image_url, multi-image -> reference_image_urls.
        if (effectiveImageUrls.length === 1) {
          payload.image_url = effectiveImageUrls[0];
        } else {
          payload.reference_image_urls = effectiveImageUrls.slice(0, 5);
        }
      }
      if (effectiveVideoUrls.length > 0) {
        // Keep best-effort single documented-style video URL key to reduce schema validation noise.
        payload.video_url = effectiveVideoUrls[0];
      }

      // Veo 3.1 multi-image mode expects 16:9 in provider docs.
      if (normalizedModel === "veo-31" && Array.isArray(payload.reference_image_urls) && payload.reference_image_urls.length >= 3) {
        payload.aspect_ratio = "16:9";
      }

      console.log("[VideoGenAPI Proxy] 📹 RESOLUTION BEING SENT:", payload.resolution);
      console.log("[VideoGenAPI Proxy] Forwarding creation request to VideoGenAPI...", JSON.stringify(payload));

      const response = await fetch("https://videogenapi.com/api/v1/generate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      // Only mark as rate-limited if the API itself returns rate_limit info AND usage >= limit
      if (responseData.rate_limit) {
        const usage = responseData.rate_limit.current_usage || 0;
        const limit = responseData.rate_limit.limit || 999;
        const secondsUntilReset = responseData.rate_limit.seconds_until_reset || 60;
        updateKeyUsage(apiKey, usage, limit);
        if (limit !== "unlimited" && usage >= limit) {
          markKeyAsRateLimited(apiKey, Math.min(secondsUntilReset, 15 * 60));
        }
      }

      if (!response.ok) {
        console.warn("[VideoGenAPI Proxy] Generation request rejected:", JSON.stringify(responseData));
        console.warn("[VideoGenAPI Proxy] 🔍 DEBUG - Error structure:", {
          hasError: !!responseData.error,
          errorType: typeof responseData.error,
          hasDetails: !!responseData.details,
          detailsType: typeof responseData.details,
          fullErrorLower: JSON.stringify(responseData).toLowerCase()
        });
        
        // Check for rate limit error - mark key as limited for 15 min max
        const errorMessage = JSON.stringify(responseData).toLowerCase();
        
        if (errorMessage.includes("daily limit") || errorMessage.includes("dailylimit") || errorMessage.includes("rate limit")) {
          console.warn(`[VideoGenAPI Proxy] ⚠️ Rate/daily limit hit on ${apiKeys.find(k => k.key === apiKey)?.alias || 'current key'} - marking for 15 min`);
          markKeyAsRateLimited(apiKey, 15 * 60); // Cap at 15 min (real window)
          
          // Try with next available key
          const nextKey = selectBestAvailableApiKey();
          if (nextKey) {
            console.log(`[VideoGenAPI Proxy] 🔄 Switching to ${nextKey.alias} - please retry your request`);
            return res.status(503).json({
              error: {
                code: "daily_limit_exceeded",
                message: "Current API key has exceeded daily limit. The system has switched to backup key. Please retry your request.",
                details: ["Switched to backup API key. Please retry your request."]
              }
            });
          } else {
            console.warn(`[VideoGenAPI Proxy] ⚠️ All API keys are exhausted!`);
            return res.status(503).json({
              error: {
                code: "all_keys_exhausted",
                message: "All API keys have exceeded their daily limits. Please try again tomorrow.",
                details: ["All API keys exhausted. Service unavailable until limits reset."]
              }
            });
          }
        }
        
        // Handle 429 rate limit errors - mark key as unavailable
        if (response.status === 429 && responseData.details) {
          const resetSeconds = responseData.details.seconds_until_reset || 600;
          markKeyAsRateLimited(apiKey, resetSeconds);
        }
        
        return res.status(response.status).json(normalizeProviderError(responseData, response.status));
      }

      // If successful, seed the task in our in-memory store so the UI can check webhook status as well
      const taskId = responseData.generation_id;
      if (taskId) {
        webhookTasksStore.set(taskId, {
          id: taskId,
          status: "queued",
          created_at: Math.floor(Date.now() / 1000),
          model: model || "seedance-2-0",
          data: null
        });
        
        // Increment daily counter for tracking
        const usedKeyInfo = apiKeys.find(k => k.key === apiKey);
        if (usedKeyInfo) {
          usedKeyInfo.dailyVideosGenerated++;
          console.log(`[Multi-Key System] 📹 ${usedKeyInfo.alias} generated video #${usedKeyInfo.dailyVideosGenerated} today (Task ID: ${taskId})`);
        }
      }

      return res.json({
        success: true,
        taskId: taskId,
        status: "queued"
      });
    } catch (error: any) {
      console.error("[VideoGenAPI Proxy] Error generating video:", error);
      return res.status(500).json({
        error: {
          code: "internal_error",
          message: error.message || "An unexpected error occurred on the proxy server."
        }
      });
    }
  });

  // API Route: Proxy Task Status Check (Polling)
  app.get("/api/seedance/tasks/:id", async (req, res) => {
    const taskId = req.params.id;
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: "missing_api_key",
          message: "API Key is required."
        }
      });
    }

    try {
      console.log(`[VideoGenAPI Proxy] Fetching task status for ${taskId}...`);
      const response = await fetch(`https://videogenapi.com/api/v1/status/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Fall back to webhook store if VideoGenAPI fails or returns 404, just in case
        const storedTask = webhookTasksStore.get(taskId);
        if (storedTask) {
          return res.json(storedTask);
        }
        return res.status(response.status).json(responseData);
      }

      // Map statuses from VideoGenAPI format to the Seedance format that the frontend expects
      const statusMap: Record<string, string> = {
        "pending": "queued",
        "in_progress": "generating",
        "completed": "completed",
        "failed": "failed"
      };

      const originalStatus = responseData.status;
      const normalizedStatus = statusMap[originalStatus] || originalStatus || "queued";

      const normalizedResponse = {
        id: taskId,
        status: normalizedStatus,
        failed_reason: responseData.failed_reason || responseData.error || responseData.message || null,
        data: {
          results: responseData.video_url ? [responseData.video_url] : [],
          last_frame_url: responseData.video_url || null,
          processing_time: responseData.processing_time || null,
          ...responseData
        }
      };

      // Sync local store
      webhookTasksStore.set(taskId, normalizedResponse);

      return res.json(normalizedResponse);
    } catch (error: any) {
      console.error(`[VideoGenAPI Proxy] Error checking task ${taskId}:`, error);
      // Fall back to stored task if we have it
      const storedTask = webhookTasksStore.get(taskId);
      if (storedTask) {
        return res.json(storedTask);
      }
      return res.status(500).json({
        error: {
          code: "internal_error",
          message: error.message || "Failed to contact VideoGenAPI server."
        }
      });
    }
  });

  // API Route: Delete Task (from remote API and memory)
  app.delete("/api/seedance/tasks/:id", async (req, res) => {
    const taskId = req.params.id;
    const apiKey = getApiKey(req);
    
    // Always delete from local memory webhook store
    webhookTasksStore.delete(taskId);

    if (!apiKey) {
      return res.json({ success: true, message: "Deleted locally (missing API key for remote)" });
    }

    try {
      console.log(`[VideoGenAPI Proxy] Deleting task ${taskId} from remote API...`);
      const remoteResTask = await fetch(`https://videogenapi.com/api/v1/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      const remoteResGen = await fetch(`https://videogenapi.com/api/v1/generations/${taskId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      return res.json({ 
        success: true, 
        message: "Deleted successfully",
        remoteTaskStatus: remoteResTask.status,
        remoteGenStatus: remoteResGen.status
      });
    } catch (error: any) {
      console.warn(`[VideoGenAPI Proxy] Error deleting task ${taskId} from remote API:`, error.message || error);
      return res.json({ success: true, message: "Deleted locally, remote delete encountered an issue" });
    }
  });

  // API Route: Proxy Video Generation History
  app.get("/api/seedance/history", async (req, res) => {
    // History endpoint is unlimited, so ignore rate limits
    const apiKey = getApiKey(req, true);
    console.log("[VideoGenAPI Proxy] 🔍 History request received. Has API key:", !!apiKey);
    
    if (!apiKey) {
      console.warn("[VideoGenAPI Proxy] ❌ No API key found for history request");
      return res.status(401).json({
        error: {
          code: "missing_api_key",
          message: "API Key is required to fetch history."
        }
      });
    }

    try {
      console.log("[VideoGenAPI Proxy] 📡 Fetching generations history from VideoGenAPI...");
      console.log("[VideoGenAPI Proxy] Using API key:", apiKey.substring(0, 20) + "...");
      
      // Try /api/v1/generations first as it is the most common history list endpoint
      const responseGen = await fetch("https://videogenapi.com/api/v1/generations", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      console.log(`[VideoGenAPI Proxy] /api/v1/generations response status: ${responseGen.status}`);

      if (responseGen.ok) {
        const responseData = await responseGen.json();
        console.log("[VideoGenAPI Proxy] ✅ History fetch successful from /api/v1/generations.");
        console.log(`[VideoGenAPI Proxy] 📊 Found ${Array.isArray(responseData.data) ? responseData.data.length : 0} videos`);
        
        if (responseData.data?.[0]) {
          console.log("[VideoGenAPI Proxy] 🔍 Full sample object:", responseData.data[0]);
        }
        
        return res.json(responseData);
      }

      // Log error response
      const errorText = await responseGen.text();
      console.warn(`[VideoGenAPI Proxy] ⚠️ /api/v1/generations returned ${responseGen.status}:`, errorText.substring(0, 200));
      console.log(`[VideoGenAPI Proxy] Trying fallback /api/v1/tasks...`);
      
      // Fallback 1: Try /api/v1/tasks
      const responseTasks = await fetch("https://videogenapi.com/api/v1/tasks", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (responseTasks.ok) {
        const responseData = await responseTasks.json();
        console.log("[VideoGenAPI Proxy] History fetch successful from /api/v1/tasks.");
        return res.json(responseData);
      }

      console.log(`[VideoGenAPI Proxy] /api/v1/tasks returned status ${responseTasks.status}. Trying fallback /api/v1/history...`);

      // Fallback 2: Try /api/v1/history
      const responseHistory = await fetch("https://videogenapi.com/api/v1/history", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (responseHistory.ok) {
        const responseData = await responseHistory.json();
        console.log("[VideoGenAPI Proxy] History fetch successful from /api/v1/history.");
        return res.json(responseData);
      }

      console.warn("[VideoGenAPI Proxy] All VideoGenAPI history endpoints failed. Returning local webhook tasks store as fallback.");
      const localTasks = Array.from(webhookTasksStore.values());
      return res.json({
        success: true,
        generations: localTasks
      });
    } catch (error: any) {
      console.warn("[VideoGenAPI Proxy] Error fetching history from remote API. Returning local webhook tasks store:", error.message || error);
      const localTasks = Array.from(webhookTasksStore.values());
      return res.json({
        success: true,
        generations: localTasks
      });
    }
  });

  // API Route: Webhook Endpoint (Receives callback updates from Seedance)
  app.post("/api/seedance/webhook", (req, res) => {
    const callbackData = req.body;
    console.log("[Seedance API Webhook] Received callback data:", JSON.stringify(callbackData));

    if (callbackData && callbackData.id) {
      const taskId = callbackData.id;
      const current = webhookTasksStore.get(taskId) || {};
      
      webhookTasksStore.set(taskId, {
        ...current,
        id: taskId,
        status: callbackData.status,
        model: callbackData.model,
        failed_reason: callbackData.data?.failed_reason || callbackData.data?.failed_reason_code || null,
        data: callbackData.data || current.data
      });
    }

    return res.status(200).send("OK");
  });

  // Vite development middleware or production static files serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 API Keys loaded: ${apiKeys.length}`);
  });
}

startServer();
