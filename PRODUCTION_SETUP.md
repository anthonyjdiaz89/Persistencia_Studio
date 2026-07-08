# 🚀 Configuración de Producción - Seedance 2.0

## ⚠️ PROBLEMA COMÚN: "No toma ni la API ni la BD en producción"

La aplicación **NO funciona** en producción porque:

1. ❌ **Frontend y backend están separados** → El frontend no sabe dónde está el backend
2. ❌ **Variables de entorno no configuradas** → Sin API keys ni configuración de Supabase  
3. ❌ **Solo se desplegó el frontend estático** → Falta desplegar el servidor Express

## 🏗️ Arquitectura de la Aplicación

Esta aplicación tiene **2 componentes**:

```
┌─────────────────────────────────────────┐
│  FRONTEND (React + Vite)                │
│  - Interfaz de usuario                  │
│  - Archivos estáticos (HTML, CSS, JS)  │
│  - Se despliega en: Vercel, Firebase,  │
│    Netlify, etc.                        │
└─────────────────────────────────────────┘
              ↓ fetch("/api/...")
┌─────────────────────────────────────────┐
│  BACKEND (Express + Node.js)            │
│  - server.ts compilado a server.cjs     │
│  - Proxy a VideoGenAPI                  │
│  - Maneja API keys y rate limits        │
│  - Se despliega en: Render, Railway,   │
│    Cloud Run, Heroku, etc.              │
└─────────────────────────────────────────┘
```

## 🔧 Solución: Conectar Frontend con Backend

### ✅ PASO 1: Desplegar el Backend (servidor Express)

El backend **DEBE** estar corriendo en producción. Opciones:

#### Opción A: Todo en un Solo Servicio (Recomendado)
**Plataformas:** Render, Railway, Heroku  
**Ventaja:** Un solo despliegue, frontend y backend juntos

```bash
# Build automático genera frontend + backend
npm run build

# Comando de inicio ejecuta el servidor que sirve todo
npm start
```

✅ En este caso, **NO necesitas** configurar `VITE_API_URL`

#### Opción B: Frontend y Backend Separados
**Frontend:** Vercel, Netlify, Firebase Hosting  
**Backend:** Render, Railway, Cloud Run, Heroku

⚠️ En este caso, **SÍ necesitas** configurar `VITE_API_URL`

---

### ✅ PASO 2: Configurar Variables de Entorno

Según tu plataforma, agrega estas variables:

### ✅ PASO 2: Configurar Variables de Entorno

Según tu plataforma, agrega estas variables:

#### 📝 Variables Obligatorias

```bash
# API Keys (OBLIGATORIO)
VIDEOGEN_API_KEY_1=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337
VIDEOGEN_API_KEY_2=lannetech_a856d87d151fb8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee

# Supabase (OBLIGATORIO)
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=tu_supabase_anon_key_real

# Gemini (OPCIONAL)
GEMINI_API_KEY=tu_gemini_key

# ⚠️ CRÍTICO: URL del Backend (solo si están separados)
VITE_API_URL=https://tu-backend.render.com
```

#### 🎯 Cuándo Usar `VITE_API_URL`

| Escenario | VITE_API_URL | Ejemplo |
|-----------|--------------|---------|
| **Frontend + Backend juntos** (Render, Railway, Heroku) | ❌ NO configurar (dejar vacío) | - |
| **Frontend en Vercel, Backend en Render** | ✅ SÍ configurar | `https://seedance-backend.onrender.com` |
| **Frontend en Netlify, Backend en Railway** | ✅ SÍ configurar | `https://seedance-backend.railway.app` |
| **Frontend en Firebase, Backend en Cloud Run** | ✅ SÍ configurar | `https://seedance-backend-xyz.run.app` |

---

## 🚀 Guía de Despliegue por Plataforma

### 🟢 Opción 1: Render (TODO EN UNO - Recomendado)

#### Paso 1: Desplegar a Cloud Run
```bash
# 1. Build de producción
npm run build

# 2. Deploy a Cloud Run
gcloud run deploy seedance-studio \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Paso 2: Configurar Variables de Entorno en Cloud Run
```bash
gcloud run services update seedance-studio \
  --set-env-vars="VIDEOGEN_API_KEY_1=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337" \
  --set-env-vars="VIDEOGEN_API_KEY_2=lannetech_a856d87d151fb8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee" \
  --set-env-vars="SUPABASE_URL=https://bd.persistenciadigital.com" \
  --set-env-vars="SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI"
```

O desde la **consola web de Cloud Run:**
1. Ve a [Cloud Run Console](https://console.cloud.google.com/run)
2. Click en tu servicio `seedance-studio`
3. Click "EDIT & DEPLOY NEW REVISION"
4. En la pestaña "Variables & Secrets" → "Variables"
5. Agrega cada variable manualmente:
   - `VIDEOGEN_API_KEY_1` = `lannetech_07cde...`
   - `VIDEOGEN_API_KEY_2` = `lannetech_a856...`
   - `SUPABASE_URL` = `https://bd.persistenciadigital.com`
   - `SUPABASE_ANON_KEY` = `tu_anon_key`
6. Click "DEPLOY"

---

## 🚀 Guía de Despliegue por Plataforma

### 🟢 Opción 1: Render (TODO EN UNO - Recomendado)

✅ **Ventajas:** Un solo servicio, configuración simple, frontend y backend juntos  
💰 **Costo:** Plan gratuito disponible (con limitaciones)

#### 1. Crear Web Service en Render

```bash
# En Render Dashboard:
1. New → Web Service
2. Conectar tu repositorio de GitHub
3. Configuración:
   - Name: seedance-studio
   - Build Command: npm run build
   - Start Command: npm start
   - Environment: Node
```

#### 2. Agregar Variables de Entorno

En Render Dashboard → Environment:

```bash
VIDEOGEN_API_KEY_1=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337
VIDEOGEN_API_KEY_2=lannetech_a856d87d151fb8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=tu_supabase_anon_key_real
GEMINI_API_KEY=tu_gemini_key (opcional)

# ⚠️ NO agregar VITE_API_URL (no es necesario cuando todo está junto)
```

#### 3. Deploy

Render detecta automáticamente `package.json` y ejecuta el build. El servidor servirá el frontend y manejará las API requests.

✅ **Resultado:** `https://seedance-studio.onrender.com` tendrá todo funcionando

---

### 🔵 Opción 2: Vercel Frontend + Render Backend (SEPARADO)

#### Parte A: Desplegar Backend en Render

1. Crear Web Service como arriba
2. Configurar variables:
   ```bash
   VIDEOGEN_API_KEY_1=lannetech_...
   VIDEOGEN_API_KEY_2=lannetech_...
   SUPABASE_URL=https://bd.persistenciadigital.com
   SUPABASE_ANON_KEY=tu_key
   ```
3. Anotar la URL: `https://seedance-backend.onrender.com`

#### Parte B: Desplegar Frontend en Vercel

1. Importar repositorio en Vercel
2. **CRITICAL:** Agregar variable de entorno:
   ```bash
   VITE_API_URL=https://seedance-backend.onrender.com
   ```
3. Deploy

✅ El frontend ahora sabe dónde está el backend

---

### 🟣 Opción 3: Railway (TODO EN UNO)

### 🟣 Opción 3: Railway (TODO EN UNO)

Similar a Render:

```bash
1. Conectar repositorio en Railway
2. Variables → Agregar todas las variables
   (NO incluir VITE_API_URL)
3. Deploy automático
```

---

### 🟠 Opción 4: Firebase Hosting + Cloud Run

#### Backend en Cloud Run

```bash
gcloud run deploy seedance-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

Anotar URL: `https://seedance-backend-xyz.run.app`

#### Frontend en Firebase Hosting

```bash
firebase deploy --only hosting
```

Configurar en Firebase Console → Environment Config:

```bash
VITE_API_URL=https://seedance-backend-xyz.run.app
```

---

## ✅ Verificación Post-Despliegue

### 1. Verificar que el Backend esté corriendo

```bash
curl https://tu-url/api/config
```

Deberías ver:

```json
{
  "status": "ok",
  "hasApiKey": true,
  "multiKeyEnabled": true,
  "totalKeys": 2
}
```

❌ Si ves error 404 → El backend NO está corriendo  
❌ Si ves `hasApiKey: false` → Variables de entorno no configuradas

### 2. Verificar que el Frontend se conecte al Backend

Abre la consola del navegador en tu app:

```
✅ Busca: "[Config] API_BASE_URL: https://tu-backend..."
❌ Si ves: "[Config] API_BASE_URL: same domain" pero no funciona 
   → Necesitas configurar VITE_API_URL
```

### 3. Probar carga de datos

```bash
# Verificar history
curl https://tu-backend/api/seedance/history

# Verificar multi-key status  
curl https://tu-backend/api/keys/status
```

---

## 🐛 Troubleshooting

### ❌ Error: "Failed to fetch" / Network Error

**Causa:** El frontend no puede conectarse al backend

**Soluciones:**

1. **Si todo está en un servicio (Render/Railway):**
   ```bash
   # Verificar que VITE_API_URL NO esté configurada
   # El sistema debe usar rutas relativas
   ```

2. **Si están separados:**
   ```bash
   # Verificar que VITE_API_URL esté configurada correctamente
   VITE_API_URL=https://tu-backend-real.com
   
   # Verificar que el backend acepte CORS del frontend
   ```

### ❌ Error: "No API keys configured"

**Causa:** `VIDEOGEN_API_KEY_1` y/o `VIDEOGEN_API_KEY_2` no están configuradas

**Solución:**
```bash
# Agregar en tu plataforma:
VIDEOGEN_API_KEY_1=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337
VIDEOGEN_API_KEY_2=lannetech_a856d87d151fb8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee
```

### ❌ Error: "Supabase configuration missing"

**Causa:** `SUPABASE_URL` o `SUPABASE_ANON_KEY` no configuradas

**Solución:**
```bash
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=tu_key_real
```

### ❌ Error: CORS / Cross-Origin Request Blocked

**Causa:** Frontend en un dominio, backend en otro, sin CORS configurado

**Solución:**

El `server.ts` ya tiene CORS habilitado, pero verifica que `VITE_API_URL` apunte a la URL correcta:

```typescript
// En server.ts (ya está implementado):
app.use(cors({
  origin: '*', // Acepta todos los orígenes
  credentials: true
}));
```

### ❌ Error: "Cannot GET /api/config" (404)

**Causa:** El backend NO está desplegado o no está corriendo

**Solución:**
1. Verificar que ejecutaste `npm run build` (compila frontend + backend)
2. Verificar que ejecutaste `npm start` (inicia el servidor)
3. Verificar logs de tu plataforma para errores de inicio

---

## 📊 Checklist de Despliegue Exitoso

- [ ] ✅ Backend desplegado y corriendo
- [ ] ✅ `VIDEOGEN_API_KEY_1` y `VIDEOGEN_API_KEY_2` configuradas
- [ ] ✅ `SUPABASE_URL` y `SUPABASE_ANON_KEY` configuradas  
- [ ] ✅ `VITE_API_URL` configurada (solo si frontend y backend separados)
- [ ] ✅ `/api/config` responde correctamente
- [ ] ✅ `/api/keys/status` muestra las 2 keys
- [ ] ✅ Frontend carga sin errores en consola
- [ ] ✅ Puedes ver el historial de videos
- [ ] ✅ Puedes subir imágenes de referencia
- [ ] ✅ Puedes generar un video de prueba

---

## 📦 Build de Producción

### Comando completo:
```bash
npm run build
```

Este comando ejecuta:
1. `vite build` → Compila el frontend (React) a `dist/`
2. `esbuild server.ts` → Compila el backend (Express) a `dist/server.cjs`

### Iniciar en producción:
```bash
npm start
```

Esto ejecuta: `node dist/server.cjs`

---

## 🔐 Seguridad

⚠️ **NUNCA** subas el archivo `.env` al repositorio.  
⚠️ **NUNCA** hagas commit de las API keys directamente en el código.  
✅ Usa siempre las variables de entorno de la plataforma de hosting.

---

## 💰 Costos Actuales

Con las 2 API keys configuradas:
- **Capacidad:** 20 videos/día
- **Costo:** $400 USD/mes
- **Costo por video:** $0.67 USD (uso al 100%)

Si necesitas más capacidad, agrega `VIDEOGEN_API_KEY_3`, `VIDEOGEN_API_KEY_4`, etc.

---

**Fecha:** 2026-07-08  
**Última actualización:** Configuración multi-key con tracking diario
